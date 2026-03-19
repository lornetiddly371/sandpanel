package mods

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Manager struct {
	ConfigRoot string
}

type Subscription struct {
	ID      string `json:"id"`
	Enabled bool   `json:"enabled"`
}

func New(configRoot string) *Manager {
	return &Manager{ConfigRoot: configRoot}
}

func (m *Manager) ModsPath() string {
	return filepath.Join(m.ConfigRoot, "Mods.txt")
}

func (m *Manager) statePath() string {
	return filepath.Join(m.ConfigRoot, "ModsState.json")
}

func (m *Manager) ReadModIDs() ([]string, error) {
	b, err := os.ReadFile(m.ModsPath())
	if err != nil {
		return nil, err
	}
	lines := strings.Split(strings.ReplaceAll(string(b), "\r\n", "\n"), "\n")
	ids := make([]string, 0, len(lines))
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l == "" || strings.HasPrefix(l, ";") || strings.HasPrefix(l, "#") {
			continue
		}
		ids = append(ids, l)
	}
	return ids, nil
}

func (m *Manager) EnabledIDs() ([]string, error) {
	subs, err := m.LoadSubscriptions()
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(subs))
	for _, sub := range subs {
		if sub.Enabled {
			out = append(out, sub.ID)
		}
	}
	return out, nil
}

func (m *Manager) LoadSubscriptions() ([]Subscription, error) {
	subs := []Subscription{}
	if b, err := os.ReadFile(m.statePath()); err == nil && len(strings.TrimSpace(string(b))) > 0 {
		if err := json.Unmarshal(b, &subs); err != nil {
			return nil, fmt.Errorf("parse ModsState.json: %w", err)
		}
	}
	normalized := normalizeSubscriptions(subs)
	enabledFromTxt, err := m.ReadModIDs()
	if err != nil && !os.IsNotExist(err) {
		return nil, err
	}
	if err == nil {
		normalized = mergeSubscriptionsWithModsTxt(normalized, enabledFromTxt)
	}
	normalized = normalizeSubscriptions(normalized)
	if err := m.SaveSubscriptions(normalized); err != nil {
		return nil, err
	}
	return normalized, nil
}

func (m *Manager) SaveSubscriptions(subs []Subscription) error {
	subs = normalizeSubscriptions(subs)
	body, err := json.MarshalIndent(subs, "", "  ")
	if err != nil {
		return err
	}
	body = append(body, '\n')
	if err := os.MkdirAll(m.ConfigRoot, 0o755); err != nil {
		return err
	}
	tmp := m.statePath() + ".tmp"
	if err := os.WriteFile(tmp, body, 0o644); err != nil {
		return err
	}
	if err := os.Rename(tmp, m.statePath()); err != nil {
		if writeErr := os.WriteFile(m.statePath(), body, 0o644); writeErr != nil {
			return err
		}
	}
	return m.SyncModsTxt(subs)
}

func (m *Manager) SyncModsTxt(subs []Subscription) error {
	if err := os.MkdirAll(m.ConfigRoot, 0o755); err != nil {
		return err
	}
	enabled := make([]string, 0, len(subs))
	for _, sub := range subs {
		if sub.Enabled {
			enabled = append(enabled, sub.ID)
		}
	}
	content := strings.Join(enabled, "\n")
	if content != "" {
		content += "\n"
	}
	return os.WriteFile(m.ModsPath(), []byte(content), 0o644)
}

func (m *Manager) Add(id string) ([]Subscription, error) {
	id = sanitizeID(id)
	if id == "" {
		return nil, fmt.Errorf("invalid mod id")
	}
	subs, err := m.LoadSubscriptions()
	if err != nil {
		return nil, err
	}
	for i := range subs {
		if subs[i].ID == id {
			subs[i].Enabled = true
			if err := m.SaveSubscriptions(subs); err != nil {
				return nil, err
			}
			return subs, nil
		}
	}
	subs = append(subs, Subscription{ID: id, Enabled: true})
	if err := m.SaveSubscriptions(subs); err != nil {
		return nil, err
	}
	return subs, nil
}

func (m *Manager) SetEnabled(id string, enabled bool) ([]Subscription, error) {
	id = sanitizeID(id)
	if id == "" {
		return nil, fmt.Errorf("invalid mod id")
	}
	subs, err := m.LoadSubscriptions()
	if err != nil {
		return nil, err
	}
	for i := range subs {
		if subs[i].ID == id {
			subs[i].Enabled = enabled
			if err := m.SaveSubscriptions(subs); err != nil {
				return nil, err
			}
			return subs, nil
		}
	}
	subs = append(subs, Subscription{ID: id, Enabled: enabled})
	if err := m.SaveSubscriptions(subs); err != nil {
		return nil, err
	}
	return subs, nil
}

func (m *Manager) SetEnabledIDs(ids []string) ([]Subscription, error) {
	subs, err := m.LoadSubscriptions()
	if err != nil {
		return nil, err
	}
	enabledSet := map[string]struct{}{}
	for _, raw := range ids {
		id := sanitizeID(raw)
		if id == "" {
			continue
		}
		enabledSet[id] = struct{}{}
	}
	idx := map[string]int{}
	for i := range subs {
		idx[subs[i].ID] = i
	}
	for i := range subs {
		_, ok := enabledSet[subs[i].ID]
		subs[i].Enabled = ok
	}
	for id := range enabledSet {
		if _, ok := idx[id]; !ok {
			subs = append(subs, Subscription{ID: id, Enabled: true})
		}
	}
	if err := m.SaveSubscriptions(subs); err != nil {
		return nil, err
	}
	return subs, nil
}

func BuildTravelURL(mapName, scenario string, mutators []string, password string) string {
	base := normalizeMapName(mapName, scenario)
	params := []string{}
	if scenario != "" {
		params = append(params, "Scenario="+scenario)
	}
	if len(mutators) > 0 {
		params = append(params, "Mutators="+strings.Join(mutators, ","))
	}
	password = strings.TrimSpace(password)
	if password != "" {
		params = append(params, "Password="+password)
	}
	if len(params) == 0 {
		return base
	}
	return base + "?" + strings.Join(params, "?")
}

func normalizeSubscriptions(in []Subscription) []Subscription {
	out := make([]Subscription, 0, len(in))
	seen := map[string]bool{}
	for _, sub := range in {
		id := sanitizeID(sub.ID)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		out = append(out, Subscription{ID: id, Enabled: sub.Enabled})
	}
	return out
}

func mergeSubscriptionsWithModsTxt(existing []Subscription, enabledFromTxt []string) []Subscription {
	idx := map[string]Subscription{}
	for _, sub := range existing {
		idx[sub.ID] = sub
	}
	out := make([]Subscription, 0, len(existing)+len(enabledFromTxt))
	seen := map[string]bool{}
	for _, raw := range enabledFromTxt {
		id := sanitizeID(raw)
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true
		sub, ok := idx[id]
		if !ok {
			sub = Subscription{ID: id}
		}
		sub.Enabled = true
		out = append(out, sub)
	}
	for _, sub := range existing {
		if seen[sub.ID] {
			continue
		}
		sub.Enabled = false
		out = append(out, sub)
	}
	return out
}

func sanitizeID(id string) string {
	id = strings.TrimSpace(id)
	if id == "" {
		return ""
	}
	for _, r := range id {
		if r < '0' || r > '9' {
			return ""
		}
	}
	return id
}

// UE4 travel roots for stock maps differ from many user-facing map labels.
var travelRootAlias = map[string]string{
	"Crossing":  "Canyon",
	"Hideout":   "Town",
	"Hillside":  "Sinjar",
	"Outskirts": "Compound",
	"Refinery":  "Oilfield",
	"Summit":    "Mountain",
	"Tideway":   "Buhriz",
}

func normalizeMapName(mapName, scenario string) string {
	mapName = strings.TrimSpace(mapName)
	if mapName == "" {
		if prefix := scenarioMapPrefix(scenario); prefix != "" {
			mapName = prefix
		}
	}
	if mapped, ok := travelRootAlias[mapName]; ok {
		return mapped
	}
	return mapName
}

func scenarioMapPrefix(scenario string) string {
	scenario = strings.TrimSpace(scenario)
	scenario = strings.TrimPrefix(scenario, "Scenario_")
	if scenario == "" {
		return ""
	}
	if idx := strings.Index(scenario, "_"); idx > 0 {
		return scenario[:idx]
	}
	return scenario
}
