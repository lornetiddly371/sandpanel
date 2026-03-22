# Profiles

Profiles are how you run different server configurations. Each profile has its own ports, map, scenario, mods, and settings — so you can have a coop Checkpoint server and a competitive Push server running side by side from the same SandPanel install.

The sidebar has a profile selector that affects everything — Server Control, Mods, Config, Logs all work on whichever profile you have selected.

## Creating profiles

You have a few options:

- **Clone** — duplicates the current profile with offset ports (+100 for game/query, +10 for RCON) so there are no conflicts. Good when you want a variation of an existing setup.
- **New Profile** — starts fresh with defaults (Hideout, Checkpoint Security, ports 27202/27231/27025).

You can also **Delete** a profile, but only when its server isn't running. It asks for confirmation.

## Core settings

**Name** — just a label. Shows up in the sidebar and dashboard.

**Default Map** and **Scenario** — the map dropdown shows all available Sandstorm maps. When you pick a map, the scenario dropdown filters to only show scenarios available on that map. If you switch maps, the scenario resets so you don't accidentally end up with an invalid combination.

**Ports** — game (UDP), query (UDP), and RCON (TCP). Each profile needs unique ports. If you're running multiple profiles, make sure these don't overlap.

**RCON Password** — the panel uses this to talk to the game server. Has to match what the server is configured with.

**Joining Password** — optional. If set, players need to enter it to connect. Leave blank for a public server. Same field also exists on [[Server Control]].

**Mutators** — a multi-select combo box. Pulls from both the built-in Sandstorm mutators and any custom mutators from installed mods. When you pick a mutator that comes from a mod, that mod gets enabled automatically. These get passed as launch args.

**Additional Args** — free-form space-separated arguments appended to the server command line. Stuff like `-ansimalloc -log`. The panel suggests `-ansimalloc` since that tends to improve stability.

**Default Lighting** — day or night toggle. Night makes the server start in darkness.

## Welcome & goodbye messages

You can set messages that get posted in server chat when players join or leave. There are separate versions for regular players and admins (players whose SteamIDs are in `Admins.txt`).

These support a few template variables you can drop in:

- `{player_name}` — the player's name
- `{steam_id}` — their SteamID64
- `{player_count}` — current player count
- `{server_name}` — the profile name

So something like `Welcome {player_name}! ({player_count} online)` works.

## Tokens display

If you've set up a Game Stats Token or Steam Server Login Token in [[Operations]], a small card shows the masked last 4 digits of each. These are global — they apply to all profiles on launch. You configure them in Operations, not here.

## Config and log paths

At the bottom there's a read-only card showing where this profile's config files and logs live on disk. For new profiles these paths are auto-generated based on the profile ID.
