# RCON Console

Terminal-style interface for sending commands directly to the game server.

## Two modes

There's a toggle at the top of the input bar:

- **RCON** (indigo) — sends raw RCON commands. Stuff like `listplayers`, `kick <steamid>`, `changelevel Farmhouse`.
- **Message** (green) — wraps your input in `say` so it shows up as a chat message to everyone on the server.

Quick shortcut: **AltGr+Enter** sends in the opposite mode without switching. So if you're in RCON mode but want to quick-fire a chat message, just hold AltGr and hit Enter.

## Output

The main area shows a scrolling log of everything you've sent and received. Commands show in indigo, responses in green, errors in red. Each line is timestamped. Auto-scrolls to bottom as new stuff comes in.

## Useful commands

Some Sandstorm RCON commands you'll probably use a lot:

- `listplayers` — everyone currently connected
- `kick <steamid> <reason>` — boot someone
- `ban <steamid> <duration> <reason>` — ban someone
- `unban <steamid>` — lift a ban
- `changelevel <map>` — switch maps
- `restartround` — restart the current round
- `gamemodeproperty <key> <value>` — tweak game mode settings at runtime

For kicks and bans you'll probably find it easier to use the [[Player Management]] page though, since it has one-click buttons.
