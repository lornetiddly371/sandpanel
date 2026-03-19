package ini

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var sectionRe = regexp.MustCompile(`^\s*\[([^\]]+)\]\s*$`)
var entryRe = regexp.MustCompile(`^\s*([+\-!]?)([^=\s]+)\s*=\s*(.*?)\s*$`)

func Parse(raw string) (Document, error) {
	raw = strings.ReplaceAll(raw, "\r\n", "\n")
	lines := strings.Split(raw, "\n")
	nodes := make([]Node, 0, len(lines))
	currentSection := ""
	seen := map[string]int{}

	for i, line := range lines {
		lineno := i + 1
		trimmed := strings.TrimSpace(line)
		switch {
		case trimmed == "":
			nodes = append(nodes, Node{Type: NodeBlank, Raw: line, Line: lineno, Section: currentSection})
		case strings.HasPrefix(trimmed, ";") || strings.HasPrefix(trimmed, "#"):
			nodes = append(nodes, Node{Type: NodeComment, Raw: line, Line: lineno, Section: currentSection})
		case sectionRe.MatchString(line):
			m := sectionRe.FindStringSubmatch(line)
			currentSection = m[1]
			nodes = append(nodes, Node{Type: NodeSection, Section: currentSection, Raw: line, Line: lineno})
	case entryRe.MatchString(line):
		m := entryRe.FindStringSubmatch(line)
		prefix := m[1]
		key := strings.TrimSpace(m[2])
		value, comment := splitInlineComment(m[3])
		idxKey := currentSection + "\x00" + prefix + "\x00" + key
		seen[idxKey]++
		nodes = append(nodes, Node{
			Type:    NodeEntry,
			Section: currentSection,
			Prefix:  prefix,
			Key:     key,
			Value:   value,
			Comment: comment,
			Index:   seen[idxKey] - 1,
			Raw:     line,
			Line:    lineno,
		})
		default:
			nodes = append(nodes, Node{Type: NodeRaw, Raw: line, Section: currentSection, Line: lineno})
		}
	}
	return Document{Nodes: nodes}, nil
}

func Render(doc Document) string {
	out := make([]string, 0, len(doc.Nodes))
	for _, n := range doc.Nodes {
		switch n.Type {
		case NodeSection:
			out = append(out, "["+n.Section+"]")
		case NodeEntry:
			line := fmt.Sprintf("%s%s=%s", n.Prefix, n.Key, n.Value)
			if n.Comment != "" {
				line += n.Comment
			}
			out = append(out, line)
		case NodeComment, NodeBlank, NodeRaw:
			out = append(out, n.Raw)
		default:
			out = append(out, n.Raw)
		}
	}
	return strings.TrimRight(strings.Join(out, "\n"), "\n") + "\n"
}

func BuildSchema(doc Document) Schema {
	sections := map[string][]Field{}
	for _, n := range doc.Nodes {
		if n.Type != NodeEntry {
			continue
		}
		section := n.Section
		if section == "" {
			section = "Global"
		}
		sections[section] = append(sections[section], Field{
			Section: n.Section,
			Prefix:  n.Prefix,
			Key:     n.Key,
			Label:   toLabel(n.Key),
			Value:   n.Value,
			Comment: n.Comment,
			Type:    inferFieldType(n.Key, n.Value),
			Index:   n.Index,
		})
	}
	for k := range sections {
		sort.SliceStable(sections[k], func(i, j int) bool {
			if sections[k][i].Key == sections[k][j].Key {
				return sections[k][i].Index < sections[k][j].Index
			}
			return sections[k][i].Key < sections[k][j].Key
		})
	}
	return Schema{Sections: sections}
}

func Validate(raw string) error {
	_, err := Parse(raw)
	return err
}

func ApplyUpdates(baseRaw string, updates []Field) (Parsed, error) {
	doc, err := Parse(baseRaw)
	if err != nil {
		return Parsed{}, err
	}
	for _, update := range updates {
		applied := false
		for i := range doc.Nodes {
			n := &doc.Nodes[i]
			if n.Type != NodeEntry {
				continue
			}
			if n.Section == update.Section && n.Prefix == update.Prefix && n.Key == update.Key && n.Index == update.Index {
				n.Value = update.Value
				applied = true
				break
			}
		}
		if !applied {
			doc.Nodes = appendNodeInSection(doc.Nodes, update)
		}
	}
	raw := Render(doc)
	parsedDoc, err := Parse(raw)
	if err != nil {
		return Parsed{}, err
	}
	return Parsed{Raw: raw, Doc: parsedDoc, Schema: BuildSchema(parsedDoc)}, nil
}

func appendNodeInSection(nodes []Node, f Field) []Node {
	insertAt := len(nodes)
	if f.Section != "" {
		sectionLine := -1
		for i := range nodes {
			if nodes[i].Type == NodeSection && nodes[i].Section == f.Section {
				sectionLine = i
				insertAt = i + 1
				continue
			}
			if sectionLine >= 0 && nodes[i].Type == NodeSection && nodes[i].Section != f.Section {
				insertAt = i
				break
			}
			if sectionLine >= 0 {
				insertAt = i + 1
			}
		}
	}
	newNode := Node{Type: NodeEntry, Section: f.Section, Prefix: f.Prefix, Key: f.Key, Value: f.Value, Comment: f.Comment}
	nodes = append(nodes, Node{})
	copy(nodes[insertAt+1:], nodes[insertAt:])
	nodes[insertAt] = newNode
	return nodes
}

func splitInlineComment(v string) (string, string) {
	inQuote := false
	for i, r := range v {
		switch r {
		case '"':
			inQuote = !inQuote
		case ';':
			if inQuote {
				continue
			}
			if i == 0 {
				return strings.TrimSpace(v), ""
			}
			return strings.TrimRight(v[:i], " \t"), v[i:]
		}
	}
	return strings.TrimSpace(v), ""
}

func inferFieldType(key, v string) ValueType {
	lk := strings.ToLower(strings.TrimSpace(key))
	if strings.Contains(lk, "password") || strings.Contains(lk, "token") || strings.Contains(lk, "secret") || strings.Contains(lk, "apikey") || strings.Contains(lk, "api_key") {
		return ValueSecret
	}
	lv := strings.ToLower(strings.TrimSpace(v))
	if lv == "true" || lv == "false" {
		return ValueBool
	}
	if _, err := strconv.ParseFloat(lv, 64); err == nil {
		return ValueNumber
	}
	return ValueString
}

func toLabel(k string) string {
	if k == "" {
		return ""
	}
	var b strings.Builder
	for i, r := range k {
		if i == 0 {
			b.WriteRune(toUpper(r))
			continue
		}
		if r >= 'A' && r <= 'Z' {
			b.WriteByte(' ')
		}
		if r == '_' || r == '-' || r == '.' {
			b.WriteByte(' ')
			continue
		}
		b.WriteRune(r)
	}
	return strings.TrimSpace(b.String())
}

func toUpper(r rune) rune {
	if r >= 'a' && r <= 'z' {
		return r - 32
	}
	return r
}
