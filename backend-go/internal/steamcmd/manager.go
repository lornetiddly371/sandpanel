package steamcmd

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"sandpanel/backend/internal/buffer"
	"sandpanel/backend/internal/ws"
)

const AppID = "581330"

type Status struct {
	Running          bool      `json:"running"`
	StartedAt        time.Time `json:"startedAt,omitempty"`
	LastExit         string    `json:"lastExit,omitempty"`
	LastCommand      []string  `json:"lastCommand,omitempty"`
	InstalledBuildID string    `json:"installedBuildId,omitempty"`
	LatestBuildID    string    `json:"latestBuildId,omitempty"`
	UpdateAvailable  bool      `json:"updateAvailable"`
	LastCheckAt      time.Time `json:"lastCheckAt,omitempty"`
}

type Manager struct {
	mu sync.Mutex

	binary     string
	installDir string
	login      func() (string, string)
	hub        *ws.Hub
	status     Status
	cmd        *exec.Cmd
	logs       *buffer.Ring
}

func New(binary, installDir string, login func() (string, string), hub *ws.Hub) *Manager {
	return &Manager{binary: binary, installDir: installDir, login: login, hub: hub, logs: buffer.New(4000)}
}

func (m *Manager) Status() Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.status
}

func (m *Manager) Install(validate bool, guardCode string) error {
	if err := m.prepareInstallDir(); err != nil {
		return err
	}
	appUpdate := AppID
	if validate {
		appUpdate += " validate"
	}
	args := []string{
		"+force_install_dir", m.installDir,
	}
	args = append(args, m.loginArgs(guardCode)...)
	args = append(args,
		"+app_update", appUpdate,
		"+quit",
	)
	return m.run(args)
}

func (m *Manager) Run(args []string) error {
	return m.run(args)
}

func (m *Manager) run(args []string) error {
	m.mu.Lock()
	if m.cmd != nil && m.status.Running {
		m.mu.Unlock()
		return errors.New("steamcmd task already running")
	}
	cmd := m.execCommand(args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		m.mu.Unlock()
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		m.mu.Unlock()
		return err
	}
	if err := cmd.Start(); err != nil {
		m.mu.Unlock()
		return err
	}
	m.cmd = cmd
	m.status.Running = true
	m.status.StartedAt = time.Now().UTC()
	m.status.LastExit = ""
	m.status.LastCommand = append([]string{}, args...)
	m.logs.Reset()
	m.mu.Unlock()
	m.broadcastStatus()

	go m.stream("stdout", stdout)
	go m.stream("stderr", stderr)
	go m.waitInstall(cmd)
	return nil
}

func (m *Manager) Stop() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.cmd == nil || !m.status.Running {
		return nil
	}
	if m.cmd.Process != nil {
		_ = m.cmd.Process.Kill()
	}
	m.status.Running = false
	m.status.LastExit = "killed"
	m.cmd = nil
	m.broadcastStatusLocked()
	return nil
}

func (m *Manager) CheckForUpdate(guardCode string) (Status, error) {
	m.mu.Lock()
	if m.status.Running {
		st := m.status
		m.mu.Unlock()
		return st, errors.New("steamcmd task currently running")
	}
	m.mu.Unlock()

	installed := m.readInstalledBuildID()
	latest, err := m.fetchLatestBuildID(guardCode)
	if err != nil {
		return m.Status(), err
	}

	m.mu.Lock()
	m.status.InstalledBuildID = installed
	m.status.LatestBuildID = latest
	m.status.UpdateAvailable = installed != "" && latest != "" && installed != latest
	m.status.LastCheckAt = time.Now().UTC()
	st := m.status
	m.mu.Unlock()
	m.broadcastStatus()
	return st, nil
}

func (m *Manager) Logs(limit int) []buffer.Entry {
	return m.logs.Snapshot(limit)
}

func (m *Manager) waitInstall(cmd *exec.Cmd) {
	err := cmd.Wait()
	m.mu.Lock()
	defer m.mu.Unlock()
	m.status.Running = false
	if err != nil {
		m.status.LastExit = err.Error()
	} else {
		m.status.LastExit = "ok"
	}
	m.cmd = nil
	m.broadcastStatusLocked()
}

func (m *Manager) stream(origin string, pipe any) {
	var scanner *bufio.Scanner
	switch p := pipe.(type) {
	case interface{ Read([]byte) (int, error) }:
		scanner = bufio.NewScanner(p)
	default:
		return
	}
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" {
			continue
		}
		m.logs.Add(line)
		m.hub.Broadcast([]byte(fmt.Sprintf(`{"type":"steamcmd","origin":%q,"line":%q}`, origin, line)))
	}
}

func (m *Manager) broadcastStatus() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.broadcastStatusLocked()
}

func (m *Manager) broadcastStatusLocked() {
	if m.hub == nil {
		return
	}
	payload, _ := json.Marshal(map[string]any{"type": "steamcmdStatus", "status": m.status})
	m.hub.Broadcast(payload)
}

func (m *Manager) readInstalledBuildID() string {
	path := filepath.Join(m.installDir, "steamapps", "appmanifest_581330.acf")
	b, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	re := regexp.MustCompile(`"buildid"\s+"(\d+)"`)
	mch := re.FindStringSubmatch(string(b))
	if len(mch) > 1 {
		return mch[1]
	}
	return ""
}

func (m *Manager) fetchLatestBuildID(guardCode string) (string, error) {
	args := append([]string{}, m.loginArgs(guardCode)...)
	args = append(args, "+app_info_print", AppID, "+quit")
	cmd := m.execCommand(args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("steamcmd app_info_print failed: %w", err)
	}
	text := string(out)
	re := regexp.MustCompile(`"buildid"\s+"(\d+)"`)
	all := re.FindAllStringSubmatch(text, -1)
	if len(all) == 0 {
		return "", errors.New("could not parse latest build id")
	}
	return all[len(all)-1][1], nil
}

func (m *Manager) loginArgs(guardCode string) []string {
	user, pass := "", ""
	if m.login != nil {
		user, pass = m.login()
	}
	if strings.TrimSpace(user) == "" {
		return []string{"+login", "anonymous"}
	}
	args := []string{}
	if strings.TrimSpace(guardCode) != "" {
		args = append(args, "+set_steam_guard_code", strings.TrimSpace(guardCode))
	}
	args = append(args, "+login", strings.TrimSpace(user), pass)
	return args
}

func (m *Manager) execCommand(args ...string) *exec.Cmd {
	home := filepath.Dir(m.binary)
	parts := []string{shellQuote(m.binary)}
	parts = append(parts, quoteArgs(args)...)
	commandLine := strings.Join(parts, " ")
	envScript := fmt.Sprintf("export HOME=%s; export USER=steam; export LOGNAME=steam; export LC_ALL=en_US.UTF-8; export LANG=en_US.UTF-8; exec script -qec %s /dev/null",
		shellQuote(home),
		shellQuote(commandLine),
	)
	return exec.Command("su", "-s", "/bin/bash", "steam", "-c", envScript)
}

func (m *Manager) prepareInstallDir() error {
	if err := os.MkdirAll(m.installDir, 0o755); err != nil {
		return err
	}
	chown := exec.Command("chown", "-R", "steam:steam", m.installDir)
	if out, err := chown.CombinedOutput(); err != nil {
		return fmt.Errorf("failed to prepare install dir: %v: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func quoteArgs(args []string) []string {
	out := make([]string, 0, len(args))
	for _, arg := range args {
		out = append(out, shellQuote(arg))
	}
	return out
}

func shellQuote(value string) string {
	if value == "" {
		return "''"
	}
	return "'" + strings.ReplaceAll(value, "'", `'\''`) + "'"
}
