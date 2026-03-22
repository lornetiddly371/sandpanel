# Architecture

SandPanel is two Docker containers — a Go backend and a React frontend served by Nginx — that together wrap an Insurgency: Sandstorm dedicated server.

```
┌─────────────────────────────────────────────────┐
│  Host                                           │
│                                                 │
│  ┌───────────────────┐  ┌────────────────────┐  │
│  │ sandpanel-frontend │  │ sandpanel-backend  │  │
│  │ Vite + React      │  │ Go 1.22            │  │
│  │ :22369 (web UI)   │──│ :8080 (internal)   │  │
│  │                   │  │                    │  │
│  │ SPA with proxy    │  │ Process wrapper    │  │
│  │ Dynamic forms     │  │ RCON client        │  │
│  │                   │  │ INI AST parser     │  │
│  └───────────────────┘  │ A2S query          │  │
│                         │ WebSocket logs     │  │
│                         │ SteamCMD lifecycle  │  │
│                         └────────┬───────────┘  │
│                                  │              │
│                         ┌────────▼───────────┐  │
│                         │ Sandstorm Server   │  │
│                         │ :27102 Game        │  │
│                         │ :27131 Query       │  │
│                         │ :27015 RCON        │  │
│                         └────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Frontend

SPA built with React and Vite, served by Nginx at runtime. Nginx handles static files and proxies `/api/` requests to the Go backend on port 8080. WebSocket connections for live log streaming pass through the proxy too.

State management is done with Zustand. All API calls go through a single `api.ts` module.

## Backend

The Go backend does the heavy lifting:

- Spawns and monitors game server processes (one per profile)
- RCON client implementing the Source RCON protocol
- A2S queries for live server status
- Custom INI parser that preserves comments and structure (Unreal Engine configs are picky)
- mod.io API integration for browsing and subscribing to mods
- Player tracking with persistent history across sessions
- SteamCMD process management
- Session auth with bcrypt + role-based middleware

## State storage

No database — everything is JSON files in `data/state/`.

`state.json` has user accounts, app settings, monitors, and profiles. `players.json` has the player history. Config files for each profile live in the game server's `Saved/Config/LinuxServer/` tree.

## Why network_mode: host

The backend container runs with `network_mode: host` because the game server needs direct access to UDP ports for player traffic, and SteamCMD needs outbound access. Trying to do this with port mapping is unreliable for game servers.

## CI/CD

Three GitHub Actions workflows:

- `ci.yml` — runs on PRs and pushes. Builds everything, runs tests, validates Docker images.
- `docker-publish.yml` — pushes Docker images to Docker Hub on tags and main branch pushes.
- `release.yml` — auto-generates version tags from conventional commit messages and creates GitHub releases with changelogs.
