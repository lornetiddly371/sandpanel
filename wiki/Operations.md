# Operations

The admin page. Everything here is global — it affects all profiles, not just the selected one.

## User management

Create, edit, and delete panel accounts. Each user has a name, password, and role (see [[Roles and Permissions]] for what each level can access).

To create a user: fill in the username, pick a role from the dropdown, set a password, and hit **Add User**. They can log in immediately.

Each existing user shows up as a row with edit (pencil) and delete (trash) buttons. The edit dialog lets you change the name, role, and optionally reset the password (leave the password field empty to keep the current one).

There's also a **Change My Password** section below — that's for your own account, separate from the admin user editing.

## System settings

Global config that lives in the backend state file.

**Automatic Updates** — toggle to have the backend periodically check for game server updates via SteamCMD. The **Update Interval** field controls how often (in minutes, default is 3).

**Steam Username** and **Steam Password** — credentials for SteamCMD. Needed if you're not doing anonymous installs.

**Steam API Key** — from [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey). Used for player profile lookups.

**Game Stats Token** (GST) — get one from [Steam's game server management page](https://steamcommunity.com/dev/managegameservers). Gets passed to the server as `-GameStats` on launch.

**Steam Server Token** (GSLT) — also from the game server management page. Required if you want your server to show up in the public server browser. Passed as `-GSLTGameServerToken=`.

**Session Secret** — used to sign session cookies. If you change this, everyone gets logged out. There's a **Generate Session Secret** button that creates a random one and fills the field.

There's also a **Generate Password** button — it just spits out a random password you can copy. Handy when creating new users.

Hit **Save Settings** to persist everything.

## Monitors

For keeping tabs on remote servers (or your own from the outside). Each monitor pings a server via A2S query and optionally connects via RCON.

To add one, fill in a name, host (IP or hostname), query port, RCON port, and RCON password. Then you can Start/Stop polling on each monitor. Edit and delete work like you'd expect.

## Instances

Read-only view of all profile server processes. Just shows the profile ID and whether it's running or stopped. This is more of a diagnostic thing — you'd normally use [[Server Control]] to manage instances.

## mod.io authentication

One-time setup for mod downloads. Sandstorm 1.20 moved mods to mod.io, so you need to authenticate before you can install mods.

The flow:
1. Enter your mod.io account email
2. Hit **Request Code** — you'll get a 5-digit code via email
3. Make sure the **Terms Accepted** toggle is on, hit **Save Terms**
4. Enter the security code
5. The server boots once with that code to complete the OAuth handshake
6. After that, future launches use the stored token from `data/steam-home/mod.io/`

The status box at the bottom shows the raw JSON response for debugging if something goes wrong.

## SteamCMD (quick controls)

Compact section with **Install**, **Check Update**, and **Stop** buttons. Same as the dedicated [[SteamCMD]] page but without the extras. Status JSON shows below.

## Wrapper

Controls for the backend wrapper process:

- **Restart Wrapper** — restarts the backend
- **Update Wrapper** — checks for and applies backend updates
- **Download Wrapper Logs** / **Download Logs Archive** — grab log files

A log panel below shows recent wrapper output.
