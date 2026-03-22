# Logs

Three log panels side by side, auto-refreshing every 5 seconds.

**Wrapper Logs** — output from the SandPanel backend itself. Server lifecycle stuff, RCON events, mod operations.

**SteamCMD Logs** — output from the last SteamCMD run (install, update, validate).

**Profile Logs** — logs from the game server process for the active profile.

For the profile logs there's a toggle bar at the top to switch between `server` (main game log), `stdout`, and `stderr`. The stderr output is handy when things crash.

You can also download logs — there's a button for the wrapper log, the profile log, and a "Download All" that grabs a ZIP of everything.
