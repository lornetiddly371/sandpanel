# Configuration Editor

Split-pane editor for server config files. Left side has a visual form with toggles and inputs, right side has the raw text in a Monaco editor (same engine as VS Code). They stay synced — edit one and the other updates.

## Picking a file

Dropdown at the top lets you switch between config files. You'll typically work with:

- **Game.ini** — the main one. Server settings, RCON config, game session stuff.
- **Engine.ini** — engine-level settings like networking and performance.
- **Admins.txt** — SteamID64s that get admin privileges in-game.
- **MapCycle.txt** — map rotation. One entry per line, format is `MapName?Scenario=Scenario_Name`.
- **Mods.txt** — managed by the [[Mod Management]] page, but you can edit it directly here too.
- **Motd.txt** — message of the day shown to players when they connect.

There are a few others like `GameUserSettings.ini`, `ModScenarios.txt`, and `Notes.txt`.

## The visual panel

INI entries are grouped by section (like `[/Script/Insurgency.INSGameMode]`). Each section has a collapsible header — click to expand or collapse. The section names get cleaned up for readability (e.g. `INSMultiplayerMode` becomes "INS Multiplayer Mode").

Booleans show as toggle switches. Numbers get a number input. Passwords/tokens show as masked fields. Everything else is a text input.

Clicking a field in the visual panel scrolls the raw editor to that exact line, and vice versa — scrolling the raw editor moves the visual panel to match. Handy when you're working with a long config.

## The raw editor

Full Monaco editor with INI syntax highlighting. You can add new sections, new keys, edit values, add comments — whatever you need. Changes get parsed after a short delay and show up in the visual panel.

## Saving

Hit **Save** (top right) to write to disk. There's also a **Download** button if you want to grab a copy of the raw file.

Heads up: most INI changes need a server restart to take effect. Some settings are hot-reloadable but that depends on the game, not the panel.
