# Roles and Permissions

Four roles, each inherits everything from the level below.

**User** (level 1) — can see the dashboard. That's about it.

**Moderator** (level 2) — can control the server (start/stop/restart), manage mods, send RCON commands, view logs, kick/ban players, and use the config editor.

**Admin** (level 3) — everything a moderator can do plus: create/edit/delete profiles, manage SteamCMD, access Operations (except user management).

**Host** (level 4) — full access to everything, including creating and managing other user accounts.

## What shows in the sidebar

The navigation only shows pages you have access to. If you're logged in as a User, you won't see Server Control, Profiles, etc. — they're just not there.

## Backend enforcement

This isn't just a UI thing — the API checks your role before processing any request. You can't bypass the frontend and hit restricted endpoints directly.

## The default account

First time you run SandPanel, it creates a `host` account with a random password. Check the backend logs:

```bash
docker logs sandpanel-backend 2>&1 | grep password
```

You'll be asked to change the password on first login.
