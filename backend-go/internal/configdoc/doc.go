package configdoc

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"sort"
	"strings"

	"sandpanel/backend/internal/ini"
)

type Schema struct {
	Kind     string                 `json:"kind"`
	Sections map[string][]ini.Field `json:"sections"`
}

type Parsed struct {
	Raw    string      `json:"raw"`
	Schema Schema      `json:"schema"`
	Doc    interface{} `json:"doc,omitempty"`
}

func Parse(name, raw string) (Parsed, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	switch strings.ToLower(filepath.Ext(name)) {
	case ".ini":
		doc, err := ini.Parse(raw)
		if err != nil {
			return Parsed{}, err
		}
		return Parsed{
			Raw:    ini.Render(doc),
			Doc:    doc,
			Schema: Schema{Kind: "ini", Sections: ini.BuildSchema(doc).Sections},
		}, nil
	case ".json":
		return parseJSON(name, raw)
	default:
		return parseText(name, raw)
	}
}

func Apply(name, raw string, updates []ini.Field) (Parsed, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	switch strings.ToLower(filepath.Ext(name)) {
	case ".ini":
		parsed, err := ini.ApplyUpdates(raw, updates)
		if err != nil {
			return Parsed{}, err
		}
		return Parsed{
			Raw:    parsed.Raw,
			Doc:    parsed.Doc,
			Schema: Schema{Kind: "ini", Sections: parsed.Schema.Sections},
		}, nil
	case ".json":
		return applyJSON(name, raw, updates)
	default:
		return applyText(name, raw, updates)
	}
}

func parseText(name, raw string) (Parsed, error) {
	base := strings.ToLower(filepath.Base(name))
	switch base {
	case "notes.txt":
		return parseNotes(raw)
	case "motd.txt":
		return Parsed{
			Raw: rawWithTrailingLF(raw),
			Schema: Schema{
				Kind: "text",
				Sections: map[string][]ini.Field{
					"Document": {{
						Section: "Document",
						Key:     "Text",
						Label:   "Text",
						Value:   strings.TrimRight(raw, "\n"),
						Type:    ini.ValueString,
						Index:   0,
					}},
				},
			},
		}, nil
	default:
		lines := strings.Split(strings.ReplaceAll(raw, "\r\n", "\n"), "\n")
		fields := make([]ini.Field, 0, len(lines))
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || strings.HasPrefix(trimmed, ";") || strings.HasPrefix(trimmed, "#") {
				continue
			}
			fields = append(fields, ini.Field{
				Section: "Entries",
				Key:     "Entry",
				Label:   entryLabel(base),
				Value:   trimmed,
				Type:    inferTextFieldType(base, trimmed),
				Index:   len(fields),
			})
		}
		return Parsed{
			Raw: rawWithTrailingLF(raw),
			Schema: Schema{
				Kind: "list",
				Sections: map[string][]ini.Field{
					"Entries": fields,
				},
			},
		}, nil
	}
}

func applyText(name, raw string, updates []ini.Field) (Parsed, error) {
	base := strings.ToLower(filepath.Base(name))
	switch base {
	case "notes.txt":
		return applyNotes(raw, updates)
	case "motd.txt":
		value := ""
		for _, update := range updates {
			if update.Section == "Document" && update.Key == "Text" {
				value = update.Value
				break
			}
		}
		return parseText(name, rawWithTrailingLF(value))
	default:
		type row struct {
			index int
			value string
		}
		rows := make([]row, 0, len(updates))
		for _, update := range updates {
			if update.Section != "Entries" {
				continue
			}
			if strings.TrimSpace(update.Value) == "" {
				continue
			}
			rows = append(rows, row{index: update.Index, value: strings.TrimSpace(update.Value)})
		}
		sort.SliceStable(rows, func(i, j int) bool { return rows[i].index < rows[j].index })
		lines := make([]string, 0, len(rows))
		for _, item := range rows {
			lines = append(lines, item.value)
		}
		return parseText(name, rawWithTrailingLF(strings.Join(lines, "\n")))
	}
}

func parseJSON(name, raw string) (Parsed, error) {
	base := strings.ToLower(filepath.Base(name))
	switch base {
	case "bans.json":
		type ban struct {
			PlayerID string `json:"playerId"`
			Reason   string `json:"reason"`
			Until    string `json:"until"`
		}
		items := []ban{}
		if strings.TrimSpace(raw) != "" {
			if err := json.Unmarshal([]byte(raw), &items); err != nil {
				return Parsed{}, err
			}
		}
		sections := map[string][]ini.Field{}
		for i, item := range items {
			section := fmt.Sprintf("Ban %d", i+1)
			sections[section] = []ini.Field{
				{Section: section, Key: "playerId", Label: "Player ID", Value: item.PlayerID, Type: ini.ValueString, Index: 0},
				{Section: section, Key: "reason", Label: "Reason", Value: item.Reason, Type: ini.ValueString, Index: 0},
				{Section: section, Key: "until", Label: "Until", Value: item.Until, Type: ini.ValueString, Index: 0},
			}
		}
		return Parsed{
			Raw: rawWithTrailingLF(raw),
			Schema: Schema{
				Kind:     "json-object-list",
				Sections: sections,
			},
		}, nil
	default:
		var generic any
		if strings.TrimSpace(raw) != "" {
			if err := json.Unmarshal([]byte(raw), &generic); err != nil {
				return Parsed{}, err
			}
		}
		body, _ := json.MarshalIndent(generic, "", "  ")
		return Parsed{
			Raw: rawWithTrailingLF(string(body)),
			Schema: Schema{
				Kind: "text",
				Sections: map[string][]ini.Field{
					"Document": {{
						Section: "Document",
						Key:     "Text",
						Label:   "JSON",
						Value:   strings.TrimRight(string(body), "\n"),
						Type:    ini.ValueString,
						Index:   0,
					}},
				},
			},
		}, nil
	}
}

func applyJSON(name, raw string, updates []ini.Field) (Parsed, error) {
	base := strings.ToLower(filepath.Base(name))
	switch base {
	case "bans.json":
		type ban struct {
			PlayerID string `json:"playerId"`
			Reason   string `json:"reason"`
			Until    string `json:"until"`
		}
		items := map[string]*ban{}
		order := []string{}
		for _, update := range updates {
			section := update.Section
			if section == "" {
				continue
			}
			if _, ok := items[section]; !ok {
				items[section] = &ban{}
				order = append(order, section)
			}
			switch update.Key {
			case "playerId":
				items[section].PlayerID = strings.TrimSpace(update.Value)
			case "reason":
				items[section].Reason = update.Value
			case "until":
				items[section].Until = update.Value
			}
		}
		out := make([]ban, 0, len(items))
		sort.Strings(order)
		for _, section := range order {
			item := items[section]
			if item.PlayerID == "" {
				continue
			}
			if item.Until == "" {
				item.Until = "0"
			}
			out = append(out, *item)
		}
		body, _ := json.MarshalIndent(out, "", "  ")
		return parseJSON(name, rawWithTrailingLF(string(body)))
	default:
		value := ""
		for _, update := range updates {
			if update.Section == "Document" && update.Key == "Text" {
				value = update.Value
				break
			}
		}
		return parseJSON(name, rawWithTrailingLF(value))
	}
}

type notesLineKind string

const (
	notesLooseEntry notesLineKind = "loose"
	notesPreset     notesLineKind = "preset"
	notesScenario   notesLineKind = "scenario"
)

type notesLineRef struct {
	Kind  notesLineKind
	Index int
	Line  int
}

func parseNotes(raw string) (Parsed, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	doc, err := ini.Parse(raw)
	if err != nil {
		return Parsed{}, err
	}
	sections := ini.BuildSchema(doc).Sections
	lines := strings.Split(raw, "\n")
	refs := classifyNotesLines(raw)
	for _, ref := range refs {
		value := strings.TrimSpace(lines[ref.Line])
		switch ref.Kind {
		case notesLooseEntry:
			sections["Loose Entries"] = append(sections["Loose Entries"], ini.Field{
				Section: "Loose Entries",
				Key:     "Entry",
				Label:   "Loose Entry",
				Value:   value,
				Type:    ini.ValueString,
				Index:   ref.Index,
			})
		case notesPreset:
			sections["Preset Entries"] = append(sections["Preset Entries"], ini.Field{
				Section: "Preset Entries",
				Key:     "Entry",
				Label:   "Preset Entry",
				Value:   value,
				Type:    ini.ValueString,
				Index:   ref.Index,
			})
		case notesScenario:
			sections["Scenario Entries"] = append(sections["Scenario Entries"], ini.Field{
				Section: "Scenario Entries",
				Key:     "Entry",
				Label:   "Scenario Entry",
				Value:   value,
				Type:    ini.ValueString,
				Index:   ref.Index,
			})
		}
	}
	return Parsed{
		Raw: rawWithTrailingLF(raw),
		Doc: doc,
		Schema: Schema{
			Kind:     "mixed",
			Sections: sections,
		},
	}, nil
}

func applyNotes(raw string, updates []ini.Field) (Parsed, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	lines := strings.Split(raw, "\n")
	refs := classifyNotesLines(raw)
	refMap := map[notesLineKind][]notesLineRef{}
	for _, ref := range refs {
		refMap[ref.Kind] = append(refMap[ref.Kind], ref)
	}

	type updateRow struct {
		index int
		value string
	}
	sectionUpdates := map[notesLineKind][]updateRow{}
	iniUpdates := make([]ini.Field, 0, len(updates))
	for _, update := range updates {
		switch update.Section {
		case "Loose Entries":
			sectionUpdates[notesLooseEntry] = append(sectionUpdates[notesLooseEntry], updateRow{index: update.Index, value: strings.TrimSpace(update.Value)})
		case "Preset Entries":
			sectionUpdates[notesPreset] = append(sectionUpdates[notesPreset], updateRow{index: update.Index, value: strings.TrimSpace(update.Value)})
		case "Scenario Entries":
			sectionUpdates[notesScenario] = append(sectionUpdates[notesScenario], updateRow{index: update.Index, value: strings.TrimSpace(update.Value)})
		default:
			iniUpdates = append(iniUpdates, update)
		}
	}

	for kind, items := range sectionUpdates {
		sort.SliceStable(items, func(i, j int) bool { return items[i].index < items[j].index })
		refsForKind := refMap[kind]
		for i, item := range items {
			if i < len(refsForKind) {
				lines[refsForKind[i].Line] = item.value
				continue
			}
			insertAt := len(lines)
			if len(refsForKind) > 0 {
				insertAt = refsForKind[len(refsForKind)-1].Line + 1
			}
			lines = append(lines[:insertAt], append([]string{item.value}, lines[insertAt:]...)...)
		}
		for i := len(items); i < len(refsForKind); i++ {
			lines[refsForKind[i].Line] = ""
		}
	}

	nextRaw := strings.Join(lines, "\n")
	if len(iniUpdates) > 0 {
		applied, err := ini.ApplyUpdates(nextRaw, iniUpdates)
		if err != nil {
			return Parsed{}, err
		}
		nextRaw = applied.Raw
	}
	return parseNotes(nextRaw)
}

func classifyNotesLines(raw string) []notesLineRef {
	lines := strings.Split(strings.ReplaceAll(raw, "\r\n", "\n"), "\n")
	refs := make([]notesLineRef, 0)
	counts := map[notesLineKind]int{}
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, ";") || strings.HasPrefix(trimmed, "#") {
			continue
		}
		switch {
		case strings.HasPrefix(trimmed, "(") && strings.Contains(trimmed, "Scenario="):
			refs = append(refs, notesLineRef{Kind: notesScenario, Index: counts[notesScenario], Line: i})
			counts[notesScenario]++
			continue
		}
		if strings.HasPrefix(trimmed, "[") || strings.Contains(trimmed, "=") {
			continue
		}
		if strings.Contains(trimmed, ",") {
			refs = append(refs, notesLineRef{Kind: notesPreset, Index: counts[notesPreset], Line: i})
			counts[notesPreset]++
			continue
		}
		if looksLikeLooseSetting(trimmed) {
			refs = append(refs, notesLineRef{Kind: notesLooseEntry, Index: counts[notesLooseEntry], Line: i})
			counts[notesLooseEntry]++
		}
	}
	return refs
}

func looksLikeLooseSetting(line string) bool {
	if strings.ContainsAny(line, " \t") {
		return false
	}
	hasLetter := false
	for _, r := range line {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') {
			hasLetter = true
			continue
		}
		if r >= '0' && r <= '9' {
			continue
		}
		switch r {
		case '_', '-', '.', '/':
			continue
		default:
			return false
		}
	}
	return hasLetter
}

func entryLabel(base string) string {
	switch base {
	case "mods.txt":
		return "Mod ID"
	case "admins.txt":
		return "Admin Steam ID"
	case "mapcycle.txt":
		return "Map Cycle Entry"
	case "modscenarios.txt":
		return "Mod Scenario"
	default:
		return "Entry"
	}
}

func inferTextFieldType(base, value string) ini.ValueType {
	if base == "mods.txt" || base == "admins.txt" {
		return ini.ValueNumber
	}
	if strings.Contains(strings.ToLower(base), "token") || strings.Contains(strings.ToLower(base), "secret") {
		return ini.ValueSecret
	}
	return ini.ValueString
}

func rawWithTrailingLF(raw string) string {
	return strings.TrimRight(raw, "\n") + "\n"
}
