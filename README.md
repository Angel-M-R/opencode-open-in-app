# opencode-open-in-app

An OpenCode TUI plugin for opening the current project in a desktop app.

<img width="426" height="116" alt="CleanShot 2026-08-01 at 13 11 58@2x" src="https://github.com/user-attachments/assets/105a6ffc-172d-41eb-8766-bd275387be8a" />

<img width="1052" height="394" alt="CleanShot 2026-08-01 at 13 12 37@2x" src="https://github.com/user-attachments/assets/1004207f-c5b7-4bb3-968c-c0d6df7619f1" />



## Behavior

Open the current session's project in a detected VS Code, Cursor, or platform
file explorer. Click the sidebar label or press Alt+O to use the favourite.
Click the arrow or use `/open-in-app-choose` to choose another application.
The favourite is saved with OpenCode's native plugin storage.

## OpenCode v2 migration

This branch targets OpenCode 2.0.18 and OpenTUI 0.5.12. It uses the native
`@opencode/plugin/tui` API and no longer supports the v1 plugin API.
The npm release must include this migration before the package name can be
used with v2. To try this branch now, build it locally with Node.js 22.13 or
newer and pnpm 10.8:

```sh
pnpm install --frozen-lockfile
pnpm build
```

Add the **dist directory** to `~/.config/opencode/cli.json`:

```json
{
  "plugins": ["/absolute/path/to/opencode-open-in-app/dist"]
}
```

Merge this entry with your existing `plugins` array. Keep the bundle in its
package directory so peer dependencies remain resolvable. After a v2-compatible
npm release is published, replace the path with `opencode-open-in-app@<version>`.
Restart OpenCode after changing the configuration.

Remove the old entry from `opencode.json` or `tui.json`. OpenCode v2 CLI plugins
use `cli.json` and the plural `plugins` key. See the
[official plugin documentation](https://opencode.ai/v2/docs/cli/plugins).
Preferences from the v1 key-value store are not imported; set them again once
in v2.

## Development

Bun is required for the native OpenTUI tests. CI uses Bun 1.4.2.

```sh
pnpm typecheck
pnpm test
pnpm run pack:dry-run
pnpm audit --prod --audit-level moderate
```

Unit tests cover discovery and domain behavior. Native tests render the v2
slots and exercise the plugin lifecycle with OpenTUI.
