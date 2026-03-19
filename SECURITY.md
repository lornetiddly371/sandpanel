# Security Policy

## Reporting a Vulnerability

If you find a security issue, **do not open a public issue**. Instead:

1. Email the maintainer directly, or
2. Use GitHub's [private vulnerability reporting](https://github.com/jocxfin/sandpanel/security/advisories/new)

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You should receive a response within 48 hours.

## Scope

SandPanel runs as a Docker container with `network_mode: host` and manages game server processes. Security-relevant areas include:

- **Authentication** — session-based login with bcrypt password hashing
- **RCON** — plaintext protocol (inherent to Source RCON); keep RCON port firewalled
- **API** — all endpoints (except `/api/gamestats`) require session auth
- **File access** — backend reads/writes game configs and state files within mounted volumes
- **Process execution** — backend spawns the game server binary and SteamCMD

## Best Practices

- Change the default RCON password in `.env`
- Don't expose port 8080 (backend API) to the internet — only the frontend port
- Keep the Docker socket mount commented out unless you need self-update features
- Use a reverse proxy with TLS for public-facing deployments
