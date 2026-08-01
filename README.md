# opencode-open-in-app

An OpenCode TUI plugin for opening the current project in a desktop app.

<img width="426" height="116" alt="CleanShot 2026-08-01 at 13 11 58@2x" src="https://github.com/user-attachments/assets/105a6ffc-172d-41eb-8766-bd275387be8a" />

<img width="1052" height="394" alt="CleanShot 2026-08-01 at 13 12 37@2x" src="https://github.com/user-attachments/assets/1004207f-c5b7-4bb3-968c-c0d6df7619f1" />



## Installation

Install the public package directly when it is available:

```sh
npm install opencode-open-in-app
```

OpenCode can also install npm plugins automatically. Add the package to the
global or project `opencode.json` configuration:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-open-in-app"]
}
```

Restart OpenCode after changing the configuration. The sidebar control opens
the current project in a detected VS Code, Cursor, or platform file explorer;
the selected favourite is persisted by OpenCode.

## Development

Requires Node.js 22.13 or newer and pnpm.

```sh
pnpm install
pnpm typecheck
pnpm build
```
