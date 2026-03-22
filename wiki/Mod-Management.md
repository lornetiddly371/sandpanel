# Mod Management

Where you manage which mods are installed and enabled on the current profile.

## Adding a mod

Paste a mod.io ID into the input field and hit **Add**. The panel fetches the mod's metadata (name, author, image, description) from mod.io and adds it to your profile.

You can find mod IDs on [mod.io](https://mod.io/g/insurgency) or use the [[Mod Explorer]] to browse and subscribe without leaving the panel.

You'll need to have [[Operations#modio-authentication|mod.io auth]] set up first, otherwise the API calls won't work.

## Mod cards

Each mod shows up as a card with its banner image, name, summary, download/subscriber counts, author, and tags. The important bit is the **Enabled** toggle — flipping it updates `Mods.txt` right away.

There's also a link to open the mod's page on mod.io if you want to check the full description or changelog.

## Load order

Below the add field is a textarea showing the current mod order — one ID per line, matching `Mods.txt`. Order matters here since mods listed first take priority if there are conflicts.

Edit the order directly in the textarea, then hit **Save Order**. If things look wrong, **Reload State** pulls the current state from disk.
