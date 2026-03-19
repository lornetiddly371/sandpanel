package modio

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Manager struct {
	ConfigRoot string
	StateRoot  string
}

type Settings struct {
	TermsAccepted   bool `json:"termsAccepted"`
	Authenticated   bool `json:"authenticated"`
	UserFilePresent bool `json:"userFilePresent"`
}

func New(configRoot string) *Manager {
	stateRoot := strings.TrimSpace(os.Getenv("MODIO_ROOT"))
	if stateRoot == "" {
		stateRoot = filepath.Join("/home", "steam", "mod.io")
	}
	return &Manager{ConfigRoot: configRoot, StateRoot: stateRoot}
}

func (m *Manager) filePath() string {
	return filepath.Join(m.ConfigRoot, "GameUserSettings.ini")
}

func (m *Manager) userFilePath() string {
	return filepath.Join(m.StateRoot, "254", "ModServer", "user.json")
}

func (m *Manager) readNormalized(path string) (string, bool, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return "", false, err
	}
	hasBOM := bytes.HasPrefix(b, []byte{0xEF, 0xBB, 0xBF})
	text := string(b)
	if hasBOM {
		text = string(b[3:])
	}
	return strings.ReplaceAll(text, "\r\n", "\n"), hasBOM, nil
}

func (m *Manager) GetSettings() (Settings, error) {
	text, _, err := m.readNormalized(m.filePath())
	if err != nil {
		return Settings{}, err
	}
	lines := strings.Split(text, "\n")
	inSection := false
	settings := Settings{}
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
			inSection = strings.EqualFold(trimmed, "[/Script/ModKit.ModIOClient]")
			continue
		}
		if !inSection {
			continue
		}
		if strings.HasPrefix(trimmed, "bHasUserAcceptedTerms") {
			value := strings.TrimSpace(strings.TrimPrefix(trimmed, "bHasUserAcceptedTerms"))
			value = strings.TrimPrefix(value, "=")
			settings.TermsAccepted = strings.EqualFold(strings.TrimSpace(value), "true")
		}
	}
	token, err := m.oauthToken()
	if err == nil {
		settings.UserFilePresent = true
		settings.Authenticated = strings.TrimSpace(token) != ""
	}
	if err != nil && !os.IsNotExist(err) {
		return Settings{}, err
	}
	return settings, nil
}

func (m *Manager) UpdateSettings(settings Settings) (string, error) {
	path := m.filePath()
	text, hasBOM, err := m.readNormalized(path)
	if err != nil {
		return "", err
	}

	termsValue := "False"
	if settings.TermsAccepted {
		termsValue = "True"
	}

	lines := strings.Split(text, "\n")
	out := make([]string, 0, len(lines)+4)
	inSection := false
	hasSection := false
	wroteTerms := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "[") && strings.HasSuffix(trimmed, "]") {
			if inSection && !wroteTerms {
				out = append(out, "bHasUserAcceptedTerms="+termsValue)
			}
			inSection = strings.EqualFold(trimmed, "[/Script/ModKit.ModIOClient]")
			if inSection {
				hasSection = true
				wroteTerms = false
			}
			out = append(out, line)
			continue
		}
		if !inSection {
			out = append(out, line)
			continue
		}
		if strings.HasPrefix(trimmed, "AccessToken") {
			continue
		}
		if strings.HasPrefix(trimmed, "bHasUserAcceptedTerms") {
			if !wroteTerms {
				out = append(out, "bHasUserAcceptedTerms="+termsValue)
				wroteTerms = true
			}
			continue
		}
		out = append(out, line)
	}
	if inSection && !wroteTerms {
		out = append(out, "bHasUserAcceptedTerms="+termsValue)
	}
	if !hasSection {
		if len(out) > 0 && strings.TrimSpace(out[len(out)-1]) != "" {
			out = append(out, "")
		}
		out = append(out, "[/Script/ModKit.ModIOClient]", "", "bHasUserAcceptedTerms="+termsValue)
	}

	filtered := make([]string, 0, len(out))
	for _, line := range out {
		if strings.TrimSpace(line) == "" && len(filtered) > 0 && strings.TrimSpace(filtered[len(filtered)-1]) == "" {
			continue
		}
		filtered = append(filtered, line)
	}
	result := strings.TrimRight(strings.Join(filtered, "\n"), "\n") + "\n"
	if hasBOM {
		result = string([]byte{0xEF, 0xBB, 0xBF}) + result
	}
	if err := os.WriteFile(path, []byte(result), 0o644); err != nil {
		return "", err
	}
	return result, nil
}

func (m *Manager) oauthToken() (string, error) {
	body, err := os.ReadFile(m.userFilePath())
	if err != nil {
		return "", err
	}
	var decoded struct {
		OAuth struct {
			Token string `json:"token"`
		} `json:"OAuth"`
	}
	if err := json.Unmarshal(body, &decoded); err != nil {
		return "", fmt.Errorf("parse user.json: %w", err)
	}
	return strings.TrimSpace(decoded.OAuth.Token), nil
}
