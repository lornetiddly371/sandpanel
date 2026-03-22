# Troubleshooting

## Can't log in / lost the password

The initial password is printed to the backend logs on first run:

```bash
docker logs sandpanel-backend 2>&1 | grep password
```

If the logs have rotated, you can nuke the state and start fresh:

```bash
docker compose down
rm data/state/state.json
docker compose up -d
docker logs sandpanel-backend 2>&1 | grep password
```

This resets users, profiles, monitors, and settings. Player history is in a separate file and won't be affected.

## Server starts but nobody can connect

Check the obvious stuff first:
1. Are the ports forwarded? Game port (UDP), query port (UDP), and RCON port (TCP) all need to be open.
2. Is another process using the same ports?
3. Are the ports in your [[Profiles|profile]] correct?

Check [[Logs]] for startup errors. If the server process is crashing silently, switch to the `stderr` log kind.

## RCON won't connect

The RCON password in your [[Profiles|profile]] has to match what the server expects. Double-check it's not blank or mismatched. Also make sure nothing's blocking the RCON TCP port.

## Server crashes on start (Signal 11)

Segfault. Usually one of:
- **Corrupted game files** — go to [[SteamCMD]] and run Install + Validate
- **Bad mod** — disable all mods, test, then re-enable one at a time
- **Memory allocator** — add `-ansimalloc` to Additional Args in your [[Profiles|profile]]

## Mods aren't loading / no images on mod cards

Make sure you've done the [[Operations#modio-authentication|mod.io auth setup]]. Without it, the API calls to fetch mod metadata will fail silently.

If auth is done but things still look wrong, check the wrapper logs for API errors — sometimes mod.io rate-limits requests.

## mod.io security code doesn't work

The codes expire quickly — request a fresh one. Also make sure the Terms Accepted toggle is on in [[Operations]] before trying to authenticate.

## Permission denied errors

The container runs as `PUID`/`PGID` from your `.env`. Make sure these match your host user:

```bash
id -u  # should match PUID
id -g  # should match PGID
```

## Container won't start

```bash
docker compose logs sandpanel-backend
docker compose logs sandpanel-frontend
```

Common causes: port conflicts, missing `.env`, or using the old `docker-compose` (v1) instead of `docker compose` (v2).

## network_mode: host on Mac/Windows

Docker Desktop doesn't support `network_mode: host` on Mac and Windows. This mainly matters for development — production should be on a Linux host anyway. If you're developing locally you'll need to swap to explicit port mappings in the compose file.
