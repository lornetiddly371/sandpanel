# Quick Start

Zero to running server in about 5 minutes (plus download time).

```bash
git clone https://github.com/jocxfin/sandpanel.git
cd sandpanel
cp .env.example .env
# set RCON_PASSWORD in .env
docker compose up --build -d
```

Get your login credentials:

```bash
docker logs sandpanel-backend 2>&1 | grep password
```

Open `http://localhost:22369`, log in as `host`, and go to **Server Control** → hit **Start**.

If the game files aren't installed yet, SandPanel downloads them automatically. First boot is slow (~15 GB download), subsequent starts are fast.

Once the server is up, connect in-game with `open 127.0.0.1:27102` or find it in the server browser.

From there you'll probably want to:
- Set up a [[Profiles|profile]] if you want custom maps/modes
- Browse [[Mod Explorer|mods]] and subscribe to some
- Complete the [[Operations#modio-authentication|mod.io auth]] so mod downloads work
