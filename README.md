# opencode-open-in-app

An OpenCode TUI plugin for opening the current project in a desktop app.

<img width="426" height="116" alt="CleanShot 2026-08-01 at 13 11 58@2x" src="https://github.com/user-attachments/assets/105a6ffc-172d-41eb-8766-bd275387be8a" />

<img width="1052" height="394" alt="CleanShot 2026-08-01 at 13 12 37@2x" src="https://github.com/user-attachments/assets/1004207f-c5b7-4bb3-968c-c0d6df7619f1" />



## Behavior

Open the current session's project in a detected VS Code, Cursor, or platform
file explorer. Click the sidebar label or press Alt+O to use the favourite.
Click the arrow or use `/open-in-app-choose` to choose another application.
The favourite is saved with OpenCode's native plugin storage.

## Install

Requires OpenCode 2.0.18 or newer. Install the plugin with the OpenCode CLI:

```sh
opencode plugin add opencode-open-in-app
```

Or add it to the `plugins` array in `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["opencode-open-in-app"]
}
```

Restart OpenCode after changing the configuration.

## Migrating from OpenCode v1

Version 1.0.0 uses the native `@opencode/plugin/tui` API and no longer supports
OpenCode v1. On OpenCode v1, pin `opencode-open-in-app@0.1.0`.

When moving to v2, remove the old entry from `opencode.json` or `tui.json`.
OpenCode v2 CLI plugins use `cli.json` and the plural `plugins` key. See the
[official plugin documentation](https://opencode.ai/v2/docs/cli/plugins).
Preferences from the v1 key-value store are not imported; set them again once
in v2.

## Development

Development needs Node.js 26.4 or newer and pnpm 10.8. Bun is required for
the native OpenTUI tests. CI uses Bun 1.4.2.

```sh
pnpm typecheck
pnpm test
pnpm run pack:dry-run
pnpm audit --prod --audit-level moderate
```

Unit tests cover discovery and domain behavior. Native tests render the v2
slots and exercise the plugin lifecycle with OpenTUI.
