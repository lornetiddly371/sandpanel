package fleet

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"sandpanel/backend/internal/buffer"
	"sandpanel/backend/internal/config"
	"sandpanel/backend/internal/process"
	"sandpanel/backend/internal/rcon"
	"sandpanel/backend/internal/state"
	"sandpanel/backend/internal/ws"
)

type Manager struct {
	mu       sync.Mutex
	startMu  sync.Mutex
	binary   string
	dataRoot string
	hub      *ws.Hub
	items    map[string]*process.Manager
}

func New(binary, dataRoot string, hub *ws.Hub) *Manager {
	return &Manager{
		binary:   binary,
		dataRoot: dataRoot,
		hub:      hub,
		items:    map[string]*process.Manager{},
	}
}

func (m *Manager) ensureProfile(p state.Profile) (*process.Manager, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.items[p.ID]; ok {
		// Always keep the RCON password in sync with the profile in case it changed
		if p.RCONPassword != "" {
			existing.UpdateRCONPassword(p.RCONPassword)
		}
		return existing, nil
	}
	if err := os.MkdirAll(p.ConfigRoot, 0o755); err != nil {
		return nil, err
	}
	if err := os.MkdirAll(p.LogRoot, 0o755); err != nil {
		return nil, err
	}
	if err := config.EnsureConfigTreeForProfile(p.ConfigRoot, p.RCONPassword, p.RCONPort); err != nil {
		return nil, err
	}
	pm := process.New(
		m.binary,
		p.ConfigRoot,
		p.LogRoot,
		m.hub,
		p.GamePort,
		p.QueryPort,
		p.RCONPort,
		process.WithInstance(p.ID, p.Name, p.RCONPassword),
	)
	m.items[p.ID] = pm
	return pm, nil
}

func (m *Manager) Start(ctx context.Context, p state.Profile, req process.StartRequest) error {
	m.startMu.Lock()
	defer m.startMu.Unlock()

	pm, err := m.ensureProfile(p)
	if err != nil {
		return err
	}
	if req.Map == "" {
		req.Map = p.DefaultMap
	}
	if req.Scenario == "" {
		req.Scenario = p.Scenario
	}
	if len(req.Mutators) == 0 {
		req.Mutators = append([]string{}, p.Mutators...)
	}
	if req.Password == "" && p.Password != "" {
		req.Password = p.Password
	}
	if req.Lighting == "" && p.DefaultLighting != "" {
		req.Lighting = p.DefaultLighting
	}
	req.ExtraArgs = append(append([]string{}, p.AdditionalArgs...), req.ExtraArgs...)
	if err := pm.Start(ctx, req); err != nil {
		return err
	}
	return waitForBoot(pm, 25*time.Second)
}

func (m *Manager) Stop(id string) error {
	m.startMu.Lock()
	defer m.startMu.Unlock()

	m.mu.Lock()
	pm := m.items[id]
	m.mu.Unlock()
	if pm == nil {
		return nil
	}
	return pm.Stop()
}

func (m *Manager) Status(id string) (process.Status, error) {
	m.mu.Lock()
	pm := m.items[id]
	m.mu.Unlock()
	if pm == nil {
		return process.Status{}, nil
	}
	return pm.Status(), nil
}

func (m *Manager) ListStatuses(profiles []state.Profile) map[string]process.Status {
	out := map[string]process.Status{}
	for _, p := range profiles {
		pm, err := m.ensureProfile(p)
		if err != nil {
			continue
		}
		out[p.ID] = pm.Status()
	}
	return out
}

func (m *Manager) ExecRCON(id, command string) (string, error) {
	m.mu.Lock()
	pm := m.items[id]
	m.mu.Unlock()
	if pm == nil {
		return "", fmt.Errorf("unknown profile %s", id)
	}
	return pm.ExecRCON(command)
}

func (m *Manager) ListPlayers(id string) ([]rcon.Player, []rcon.Player, error) {
	m.mu.Lock()
	pm := m.items[id]
	m.mu.Unlock()
	if pm == nil {
		return nil, nil, fmt.Errorf("unknown profile %s", id)
	}
	return pm.ListPlayers()
}

func (m *Manager) Logs(id, kind string, limit int) ([]buffer.Entry, error) {
	m.mu.Lock()
	pm := m.items[id]
	m.mu.Unlock()
	if pm == nil {
		return nil, fmt.Errorf("unknown profile %s", id)
	}
	return pm.Logs(kind, limit), nil
}

func CloneProfile(srcRoot, dstRoot string) error {
	if err := os.MkdirAll(dstRoot, 0o755); err != nil {
		return err
	}
	entries, err := os.ReadDir(srcRoot)
	if err != nil {
		return err
	}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		srcPath := filepath.Join(srcRoot, entry.Name())
		dstPath := filepath.Join(dstRoot, entry.Name())
		if _, err := os.Stat(dstPath); err == nil {
			continue
		}
		b, err := os.ReadFile(srcPath)
		if err != nil {
			return err
		}
		if err := os.WriteFile(dstPath, b, 0o644); err != nil {
			return err
		}
	}
	return nil
}

func waitForBoot(pm *process.Manager, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		status := pm.Status()
		if !status.Running {
			if strings.TrimSpace(status.LastExit) != "" {
				return fmt.Errorf("server exited during startup: %s", status.LastExit)
			}
			return fmt.Errorf("server exited during startup")
		}
		for _, entry := range pm.Logs("server", 500) {
			lower := strings.ToLower(entry.Line)
			if strings.Contains(lower, "rcon listening") || strings.Contains(lower, "game server api initialized") {
				return nil
			}
		}
		time.Sleep(500 * time.Millisecond)
	}
	return nil
}
