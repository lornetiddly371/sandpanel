# Installation

## What you need

- Docker and Docker Compose (v2)
- ~20 GB of disk space (the game server itself is about 15 GB)
- Linux is recommended, but anything that runs Docker works

## Setup

Clone the repo and create your config:

```bash
git clone https://github.com/jocxfin/sandpanel.git
cd sandpanel
cp .env.example .env
```

Open `.env` and at minimum set `RCON_PASSWORD` to something secure. The rest of the defaults are fine to start with — check [[Environment Variables]] if you want to tweak ports or paths.

Then build and start everything:

```bash
docker compose up --build -d
```

## First login

SandPanel creates a `host` account on first launch with a random password. Grab it from the logs:

```bash
docker logs sandpanel-backend 2>&1 | grep password
```

Head to `http://localhost:22369` and log in. You'll be asked to change the password right away.

The game server gets installed automatically via SteamCMD if it's not already present. First boot takes a while since it's downloading ~15 GB.

## Updating

```bash
git pull
docker compose up --build -d
```

Or if you're using pre-built images from Docker Hub:

```bash
BACKEND_IMAGE=jocxfin/sandpanel-backend:latest \
FRONTEND_IMAGE=jocxfin/sandpanel-frontend:latest \
docker compose up -d
```

## Reverse proxy

If you're exposing this publicly, put it behind a reverse proxy with TLS. Only the frontend port needs to be accessible — keep port 8080 internal.

Make sure to pass WebSocket upgrade headers, otherwise live logs and real-time updates won't work:

```nginx
server {
    listen 443 ssl;
    server_name panel.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:22369;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```
