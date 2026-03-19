package monitor

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"sandpanel/backend/internal/query"
	"sandpanel/backend/internal/rcon"
	"sandpanel/backend/internal/state"
	"sandpanel/backend/internal/ws"
)

// PlayerEventCallback is called after each poll with detected join/leave events.
type PlayerEventCallback func(sourceID string, events []state.PlayerEvent, playerCount int)

type Snapshot struct {
	ID                    string             `json:"id"`
	Name                  string             `json:"name"`
	Running               bool               `json:"running"`
	Info                  *query.Info        `json:"info,omitempty"`
	Rules                 map[string]string  `json:"rules,omitempty"`
	Players               []state.LivePlayer `json:"players,omitempty"`
	Bots                  []rcon.Player      `json:"bots,omitempty"`
	A2SConnectionProblem  bool               `json:"a2sConnectionProblem"`
	RCONConnectionProblem bool               `json:"rconConnectionProblem"`
	ServerDown            bool               `json:"serverDown"`
	LastError             string             `json:"lastError,omitempty"`
	LastPollAt            time.Time          `json:"lastPollAt,omitempty"`
}

type watcher struct {
	cfg      state.MonitorConfig
	hub      *ws.Hub
	store    *state.Store
	onEvents PlayerEventCallback
	mu       sync.Mutex
	cancel   context.CancelFunc
	snapshot Snapshot
}

func newWatcher(cfg state.MonitorConfig, hub *ws.Hub, store *state.Store, onEvents PlayerEventCallback) *watcher {
	return &watcher{
		cfg:      cfg,
		hub:      hub,
		store:    store,
		onEvents: onEvents,
		snapshot: Snapshot{
			ID:                    cfg.ID,
			Name:                  cfg.Name,
			A2SConnectionProblem:  true,
			RCONConnectionProblem: true,
			ServerDown:            true,
		},
	}
}

func (w *watcher) start() {
	w.mu.Lock()
	if w.cancel != nil {
		w.mu.Unlock()
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	w.cancel = cancel
	w.snapshot.Running = true
	w.mu.Unlock()

	go func() {
		ticker := time.NewTicker(10 * time.Second)
		defer ticker.Stop()
		w.poll()
		for {
			select {
			case <-ctx.Done():
				w.mu.Lock()
				w.snapshot.Running = false
				w.mu.Unlock()
				return
			case <-ticker.C:
				w.poll()
			}
		}
	}()
}

func (w *watcher) stop() {
	w.mu.Lock()
	defer w.mu.Unlock()
	if w.cancel != nil {
		w.cancel()
		w.cancel = nil
	}
	w.snapshot.Running = false
}

func (w *watcher) poll() {
	infoClient := query.New(w.cfg.Host, w.cfg.QueryPort, 3*time.Second)
	info, infoErr := infoClient.Info()
	rules, rulesErr := infoClient.Rules(-1)

	rconClient := rcon.New(w.cfg.Host, w.cfg.RCONPort, w.cfg.RCONPassword, 4*time.Second)
	players, bots, rconErr := rconClient.ListPlayers()
	_ = rconClient.Close()

	lastErr := ""
	a2sProblem := false
	rconProblem := false
	if infoErr != nil {
		lastErr = infoErr.Error()
		a2sProblem = true
	}
	if rulesErr != nil && lastErr == "" {
		lastErr = rulesErr.Error()
		a2sProblem = true
	}
	if rconErr != nil && lastErr == "" {
		lastErr = rconErr.Error()
		rconProblem = true
	}
	if rconErr != nil {
		rconProblem = true
	}
	observation := make([]state.PlayerObservation, 0, len(players)+len(bots))
	for _, player := range players {
		observation = append(observation, state.PlayerObservation{
			SteamID:    player.SteamID,
			Name:       player.Name,
			Score:      player.Score,
			IP:         player.IP,
			PlatformID: player.PlatformID,
			IsBot:      false,
		})
	}
	for _, bot := range bots {
		observation = append(observation, state.PlayerObservation{
			SteamID:    bot.SteamID,
			Name:       bot.Name,
			Score:      bot.Score,
			IP:         bot.IP,
			PlatformID: bot.PlatformID,
			IsBot:      true,
		})
	}
	events, livePlayers, _ := w.store.ObservePlayers(w.cfg.ID, w.cfg.Name, observation)
	if w.onEvents != nil && len(events) > 0 {
		go w.onEvents(w.cfg.ID, events, len(livePlayers))
	}

	w.mu.Lock()
	w.snapshot.Info = info
	w.snapshot.Rules = rules
	w.snapshot.Players = livePlayers
	w.snapshot.Bots = bots
	w.snapshot.A2SConnectionProblem = a2sProblem
	w.snapshot.RCONConnectionProblem = rconProblem
	w.snapshot.ServerDown = a2sProblem || rconProblem
	w.snapshot.LastError = lastErr
	w.snapshot.LastPollAt = time.Now().UTC()
	snap := w.snapshot
	w.mu.Unlock()

	payload, _ := json.Marshal(map[string]any{"type": "monitor", "monitor": snap})
	w.hub.Broadcast(payload)
}

func (w *watcher) snapshotCopy() Snapshot {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.snapshot
}

type Manager struct {
	mu       sync.Mutex
	hub      *ws.Hub
	store    *state.Store
	onEvents PlayerEventCallback
	watchers map[string]*watcher
}

func New(hub *ws.Hub, store *state.Store) *Manager {
	return &Manager{hub: hub, store: store, watchers: map[string]*watcher{}}
}

// SetOnPlayerEvents sets the callback that is invoked when join/leave events are detected.
func (m *Manager) SetOnPlayerEvents(cb PlayerEventCallback) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onEvents = cb
}

func (m *Manager) Upsert(cfg state.MonitorConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.watchers[cfg.ID]; ok {
		existing.stop()
	}
	m.watchers[cfg.ID] = newWatcher(cfg, m.hub, m.store, m.onEvents)
}

func (m *Manager) Delete(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if w, ok := m.watchers[id]; ok {
		w.stop()
	}
	delete(m.watchers, id)
}

func (m *Manager) Start(id string) error {
	m.mu.Lock()
	w := m.watchers[id]
	m.mu.Unlock()
	if w == nil {
		return fmt.Errorf("unknown monitor %s", id)
	}
	w.start()
	return nil
}

func (m *Manager) Stop(id string) error {
	m.mu.Lock()
	w := m.watchers[id]
	m.mu.Unlock()
	if w == nil {
		return fmt.Errorf("unknown monitor %s", id)
	}
	w.stop()
	return nil
}

func (m *Manager) Status(id string) (Snapshot, error) {
	m.mu.Lock()
	w := m.watchers[id]
	m.mu.Unlock()
	if w == nil {
		return Snapshot{}, fmt.Errorf("unknown monitor %s", id)
	}
	return w.snapshotCopy(), nil
}

func (m *Manager) List() []Snapshot {
	m.mu.Lock()
	watchers := make([]*watcher, 0, len(m.watchers))
	for _, w := range m.watchers {
		watchers = append(watchers, w)
	}
	m.mu.Unlock()
	out := make([]Snapshot, 0, len(watchers))
	for _, w := range watchers {
		out = append(out, w.snapshotCopy())
	}
	return out
}

func Exec(cfg state.MonitorConfig, command string) (string, error) {
	client := rcon.New(cfg.Host, cfg.RCONPort, cfg.RCONPassword, 4*time.Second)
	defer client.Close()
	return client.Exec(command)
}
