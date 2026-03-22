# Server Control

This is where you start, stop, and restart the game server for whichever profile you have selected.

## The big buttons

Three buttons up top. Start is green, Restart is amber, Stop is red. They do what you'd expect. Buttons that don't apply to the current state are grayed out (can't stop a server that isn't running, etc). Each shows a spinner while the action is processing.

## Status info

Four cards below the buttons show the current state:

- **Status** — Running (with a pulsing green dot) or Stopped
- **Uptime** — live counter that ticks every second while the server is up
- **PID** — process ID, mostly useful for debugging
- **Ports** — game, query, and RCON ports from the active profile

## A2S query

When the server is running, an extra section appears with data from an A2S query — the same thing Steam's server browser uses. Shows the server name, current map, game mode, player count, VAC status, and server version. This is basically what players see when they look at your server in the browser.

## Server settings

Two fields here:

**Joining Password** — set this if you want players to need a password to connect. Leave it blank for a public server.

**Security Code (mod.io)** — this is for the one-time mod.io auth setup. You enter the 5-digit code you get via email, and the server uses it on the next boot to complete the OAuth flow. You only need to do this once. There's also a field for this in [[Operations]], either one works.

Hit **Save Settings** to keep your changes.
