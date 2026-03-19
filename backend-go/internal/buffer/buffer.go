package buffer

import (
	"sync"
	"time"
)

type Entry struct {
	Time time.Time `json:"time"`
	Line string    `json:"line"`
}

type Ring struct {
	mu      sync.Mutex
	limit   int
	entries []Entry
}

func New(limit int) *Ring {
	if limit <= 0 {
		limit = 500
	}
	return &Ring{limit: limit, entries: make([]Entry, 0, limit)}
}

func (r *Ring) Add(line string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = append(r.entries, Entry{Time: time.Now().UTC(), Line: line})
	if len(r.entries) > r.limit {
		r.entries = append([]Entry(nil), r.entries[len(r.entries)-r.limit:]...)
	}
}

func (r *Ring) Snapshot(limit int) []Entry {
	r.mu.Lock()
	defer r.mu.Unlock()
	if limit <= 0 || limit > len(r.entries) {
		limit = len(r.entries)
	}
	start := len(r.entries) - limit
	out := make([]Entry, limit)
	copy(out, r.entries[start:])
	return out
}

func (r *Ring) Reset() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.entries = r.entries[:0]
}
