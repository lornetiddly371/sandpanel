package state

import (
	"bufio"
	"io"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// LogWatcher tails the game server log file and extracts kill/headshot/objective
// events from LogINSChallangesEventProcessor and LogGameMode entries.
// It resets its internal state on every server startup detected in the log,
// so only events from the current server session are counted.
type LogWatcher struct {
	mu      sync.Mutex
	store   *Store
	logPath string
	offset  int64
	stopCh  chan struct{}
	stopped bool

	// Set of all registered human PlayerState IDs (from Register User events)
	humanStates map[string]bool
	// Maps PlayerState ID → SteamID (built via MapNameToSteamID)
	stateToSteam map[string]string

	// Buffered events for PlayerStates that don't have a SteamID mapping yet
	pendingEvents map[string][]string // psID → list of event names

	// Per-SteamID accumulated stats (current session only)
	stats map[string]*LogPlayerStats
}

// LogPlayerStats holds kill/headshot/objective counts parsed from server logs.
// Note: the game does not log death events, so deaths are not tracked.
type LogPlayerStats struct {
	Kills       int
	Headshots   int
	Objectives  int
	WeaponKills map[string]int
}

var (
	reRegister = regexp.MustCompile(`Register User ProsID: ([a-f0-9-]+), PlayerState Name: (INSPlayerState_\d+)`)
	reEvent    = regexp.MustCompile(`Reporting event (\w+) for user (INSPlayerState_\d+)`)
)

// NewLogWatcher creates a log watcher that tails the given log file.
func NewLogWatcher(store *Store, logPath string) *LogWatcher {
	return &LogWatcher{
		store:         store,
		logPath:       logPath,
		stopCh:        make(chan struct{}),
		humanStates:   make(map[string]bool),
		stateToSteam:  make(map[string]string),
		pendingEvents: make(map[string][]string),
		stats:         make(map[string]*LogPlayerStats),
	}
}

// Start begins tailing the log file in a background goroutine.
func (w *LogWatcher) Start() {
	go w.run()
}

// Stop halts the log watcher.
func (w *LogWatcher) Stop() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if !w.stopped {
		w.stopped = true
		close(w.stopCh)
	}
}

// resetSession clears all internal state so a fresh server session starts clean.
// Must be called with w.mu held.
func (w *LogWatcher) resetSession() {
	// Zero out stats in the store for all players that had stats in the old session
	if len(w.stats) > 0 {
		zeroSnapshot := make(map[string]*LogPlayerStats, len(w.stats))
		for steamID := range w.stats {
			zeroSnapshot[steamID] = &LogPlayerStats{WeaponKills: make(map[string]int)}
		}
		// Release lock temporarily to flush zeros
		w.mu.Unlock()
		w.store.UpdateLogStats(zeroSnapshot)
		w.mu.Lock()
	}
	w.humanStates = make(map[string]bool)
	w.stateToSteam = make(map[string]string)
	w.pendingEvents = make(map[string][]string)
	w.stats = make(map[string]*LogPlayerStats)
}

// MapNameToSteamID is called from the player polling loop to associate SteamIDs
// with registered human PlayerState IDs.
func (w *LogWatcher) MapNameToSteamID(name string, steamID string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	for psID := range w.humanStates {
		if _, alreadyMapped := w.stateToSteam[psID]; !alreadyMapped {
			w.stateToSteam[psID] = steamID

			// Replay any buffered events for this PlayerState
			if pending, ok := w.pendingEvents[psID]; ok {
				for _, eventName := range pending {
					w.recordEvent(steamID, eventName)
				}
				delete(w.pendingEvents, psID)
			}
		}
	}
}

// GetStats returns the accumulated stats for a player by SteamID.
func (w *LogWatcher) GetStats(steamID string) (kills, headshots, deaths, objectives int, weaponKills map[string]int) {
	w.mu.Lock()
	defer w.mu.Unlock()
	s, ok := w.stats[steamID]
	if !ok {
		return 0, 0, 0, 0, nil
	}
	wk := make(map[string]int, len(s.WeaponKills))
	for k, v := range s.WeaponKills {
		wk[k] = v
	}
	return s.Kills, s.Headshots, 0, s.Objectives, wk
}

func (w *LogWatcher) run() {
	w.offset = 0

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.poll()
		}
	}
}

func (w *LogWatcher) poll() {
	f, err := os.Open(w.logPath)
	if err != nil {
		return
	}
	defer f.Close()

	fi, err := f.Stat()
	if err != nil {
		return
	}

	if fi.Size() < w.offset {
		w.offset = 0
	}
	if fi.Size() == w.offset {
		return
	}

	if _, err := f.Seek(w.offset, io.SeekStart); err != nil {
		return
	}

	scanner := bufio.NewScanner(f)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	linesProcessed := 0
	for scanner.Scan() {
		line := scanner.Text()
		linesProcessed++
		w.processLine(line)
	}

	newPos, _ := f.Seek(0, io.SeekCurrent)
	w.offset = newPos

	if linesProcessed > 0 {
		w.flushToStore()
	}
}

func (w *LogWatcher) processLine(line string) {
	w.mu.Lock()
	defer w.mu.Unlock()

	// Detect server startup — reset all session state so we only count
	// kills for the CURRENT server session, not historical ones.
	if strings.Contains(line, "LogInit: Command Line:") ||
		strings.Contains(line, "GameStatsServer INIT: Ready to issue login") {
		w.resetSession()
		return
	}

	// Register User ProsID: xxx, PlayerState Name: INSPlayerState_xxx
	if strings.Contains(line, "Register User ProsID:") {
		if m := reRegister.FindStringSubmatch(line); m != nil {
			psID := m[2]
			w.humanStates[psID] = true
		}
		return
	}

	// Reporting event X for user INSPlayerState_xxx
	if strings.Contains(line, "Reporting event") {
		if m := reEvent.FindStringSubmatch(line); m != nil {
			eventName := m[1]
			psID := m[2]

			steamID, mapped := w.stateToSteam[psID]
			if mapped {
				w.recordEvent(steamID, eventName)
			} else {
				w.pendingEvents[psID] = append(w.pendingEvents[psID], eventName)
			}
		}
		return
	}
}

func (w *LogWatcher) recordEvent(steamID, eventName string) {
	s, ok := w.stats[steamID]
	if !ok {
		s = &LogPlayerStats{WeaponKills: make(map[string]int)}
		w.stats[steamID] = s
	}

	lower := strings.ToLower(eventName)

	if strings.HasPrefix(lower, "kill") && strings.Contains(lower, "increaseone") {
		s.Kills++
		weapon := extractWeaponName(eventName, "Kill")
		if weapon != "" {
			s.WeaponKills[weapon]++
		}
		return
	}

	if strings.HasPrefix(lower, "headshot") && strings.Contains(lower, "increaseone") {
		s.Headshots++
		return
	}

	if strings.HasPrefix(lower, "captures") && strings.Contains(lower, "increaseone") {
		s.Objectives++
		return
	}

	if strings.HasPrefix(lower, "death") && strings.Contains(lower, "increaseone") {
		// game doesn't actually log death events, but keeping this as a no-op
		// in case future updates add them
		return
	}

	if strings.HasPrefix(lower, "nohands") && strings.Contains(lower, "increaseone") {
		s.Kills++
		s.WeaponKills["Explosive"]++
		return
	}
}

func extractWeaponName(event, prefix string) string {
	rest := event[len(prefix):]
	idx := strings.Index(rest, "Coop")
	if idx < 0 {
		idx = strings.Index(rest, "Increase")
	}
	if idx <= 0 {
		return ""
	}
	return rest[:idx]
}

func (w *LogWatcher) flushToStore() {
	w.mu.Lock()
	statsSnapshot := make(map[string]*LogPlayerStats, len(w.stats))
	for k, v := range w.stats {
		cp := *v
		cp.WeaponKills = make(map[string]int, len(v.WeaponKills))
		for wk, wv := range v.WeaponKills {
			cp.WeaponKills[wk] = wv
		}
		statsSnapshot[k] = &cp
	}
	w.mu.Unlock()

	w.store.UpdateLogStats(statsSnapshot)
}
