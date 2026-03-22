# Player Management

Two sections here: live players currently on the server, and a historical record of everyone who's ever connected.

## Live players

Table of everyone connected right now — name, SteamID, which profile they're on, and when they joined. The three-dot menu on each row gives you one-click **Kick** and **Ban**.

There are also two buttons in the header:

- **Add Ban** — opens a dialog where you can ban a SteamID manually. Useful when someone reports a player who isn't currently online. Enter the SteamID64 and a reason.
- **Unban SteamID** — same deal but in reverse. Paste the SteamID64 to lift the ban.

## Player history

A persistent database of every player who's ever connected. The data survives server restarts and persists across sessions.

There's a search bar for filtering by name or SteamID. A **Show IPs** toggle reveals IP addresses (hidden by default for obvious reasons).

The main table shows name, SteamID (links to their Steam profile), total score, when they were last seen, and total playtime.

Click any row to expand it and see more detail: first seen date, last seen date, which server they were last on, their last session score, longest session, total playtime, and high score.

Small timestamp under the page title shows when the last player join happened. Mostly just a quick sanity check.
