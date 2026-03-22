# SteamCMD

Dedicated page for managing the game server installation via SteamCMD. Also available in a compact form on the [[Operations]] page, but this one gives you more control.

## Steam Guard

If your Steam account uses Steam Guard, enter the code in the field at the top before running Install or Check Update. Leave it empty if you're doing anonymous installs or have a saved session.

## Actions

- **Install** — downloads/updates the Insurgency: Sandstorm server (AppID 581330)
- **Install + Validate** — same thing but also verifies every file against Steam's manifest. Fixes corrupted files. Takes longer.
- **Check Update** — just checks if a newer version exists without downloading anything
- **Stop Job** — cancels whatever SteamCMD is currently doing
- **Refresh** — re-fetches the status display

## Custom commands

There's an input field pre-filled with `+app_status 581330` that lets you run arbitrary SteamCMD commands. Edit the args and hit **Run Command**.

Some examples:
- `+app_status 581330` — check if the server is installed and its build ID
- `+app_info_update 1` — force refresh the app info cache
- `+app_update 581330 validate` — same as Install + Validate

Note that the backend sanitizes these — you can't run just anything.

## Status and logs

Below the actions there's a raw JSON status block (running state, last command, errors) and a log panel showing SteamCMD's stdout output. Progress bars, file validation results, error messages, etc.
