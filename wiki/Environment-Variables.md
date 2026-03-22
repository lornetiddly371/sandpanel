# Environment Variables

Everything goes in `.env` at the project root. Copy `.env.example` to get started.

## The essentials

`FRONTEND_PORT` (default: `22369`) — port you access the web UI on.

`RCON_PASSWORD` — **set this first.** Used for RCON communication between the panel and the game server.

`SANDSTORM_INSTALL_PATH` (default: `./sandstorm-install`) — where the game server files live. Can be relative or absolute.

## Ports

`GAME_PORT` (default: `27102`) — UDP, where players connect.

`QUERY_PORT` (default: `27131`) — UDP, for the Steam server browser and A2S queries.

`RCON_PORT` (default: `27015`) — TCP, for RCON.

## Container user

`PUID` / `PGID` (default: `1000`) — user and group ID inside the container. Match these to your host user (`id -u` / `id -g`) to avoid file permission headaches.

## Docker Hub images

If you're pulling pre-built images instead of building from source:

```
BACKEND_IMAGE=jocxfin/sandpanel-backend:latest
FRONTEND_IMAGE=jocxfin/sandpanel-frontend:latest
```

## CI/CD (GitHub Actions)

Only relevant if you fork the repo and want your own Docker Hub publishing:

Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

Variables: `DOCKERHUB_NAMESPACE` (falls back to username), `BACKEND_IMAGE_NAME` (default: `sandpanel-backend`), `FRONTEND_IMAGE_NAME` (default: `sandpanel-frontend`)
