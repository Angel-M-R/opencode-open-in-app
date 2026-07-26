## Why

While working inside an OpenCode session, opening the current project in a graphical editor or file manager requires leaving the TUI and retyping the project path in a shell. This repository is currently empty, so the whole plugin is greenfield: a small sidebar affordance that opens the active project root in the user's preferred desktop app removes a frequent context switch at almost zero interaction cost.

## What Changes

- Introduce a new OpenCode TUI plugin package in this repository, scaffolded from the verified patterns of the sibling `opencode-openspec-task-tui` plugin (pnpm, TypeScript NodeNext, `tsup` ESM build with `esbuild-plugin-solid` in `universal` mode, vitest, commitlint + husky).
- Register a single-line control in the host `sidebar_title` slot via `api.slots.register`, torn down through `api.lifecycle.onDispose`. The control is only visible inside a session.
- The control is two adjacent focusable regions:
  - **Label** — activating it opens the project root with the currently favourite app.
  - **Chevron** — activating it opens an `api.ui.DialogSelect` picker of detected apps; choosing one launches it and becomes the new favourite.
- Resolve the target directory as the **project root** only: `api.state.path.directory` → `api.state.path.worktree` → `process.cwd()`. No individual files, no "active file" inference.
- Detect a fixed MVP app set — **VS Code, Cursor, and the OS file explorer** — once per plugin activation with a short timeout, and show only the apps that were detected.
- Launch apps through an injectable `ProcessExecutor` using `execFile(cmd, [dir], { timeout, windowsHide: true })` with no shell. No launch or detection failure ever propagates an exception; failures surface via `api.ui.toast`.
- Persist the favourite app in `api.kv` with **global scope** — one preference shared by all projects.
- Support macOS (`open`), Linux (`xdg-open`), and Windows (`explorer`) for the file explorer, with platform behaviour covered by unit tests over a fake platform and fake executor.
- Expose the "open with favourite" action as a command plus keybinding via `api.keymap.registerLayer`, behind an optional guard because `@opentui/keymap` is not installed in this environment.
- Validate the plugin's assumptions with unit tests (fake `ProcessExecutor`, fake kv, fake platform) and a type-contract test using `expectTypeOf` against the installed `TuiSlotPlugin` / `TuiPluginApi` definitions. Typecheck and build are the executable validation gates.

Non-goals for this change: user-configurable app lists, opening individual files, inferring the active file, and CI or automated npm publishing.

## Capabilities

### New Capabilities

- `sidebar-open-in-app-control`: The `sidebar_title` slot control — its two activation regions (label and chevron), keyboard and mouse activation, visibility rules, single-line layout, and app-picker dialog behaviour.
- `project-root-resolution`: How the directory handed to an external app is resolved from the TUI plugin API, with its fallback chain and rejection of empty values.
- `desktop-app-launching`: Detection of the MVP app set per platform, caching of detection per activation, non-throwing launch through an injectable executor, and user-visible error reporting.
- `favourite-app-preference`: Globally scoped persistence of the favourite app in `api.kv`, including corrupt or unknown stored values and the default when nothing is stored.
- `plugin-packaging`: The package layout, build and type configuration, dependency policy, and validation commands that make the plugin loadable by OpenCode.

### Modified Capabilities

None — this repository has no existing specs.

## Impact

- **New code** (implemented in a later phase, not by this planning change): the plugin `src/` modules, `test/` suites, `package.json`, `tsconfig*.json`, `tsup.config.ts`, `vitest.config.ts`, commitlint and husky configuration.
- **Dependencies**: peer dependencies on `@opencode-ai/plugin`, `@opentui/core`, `@opentui/solid`, and `solid-js`; dev dependencies for TypeScript, tsup, esbuild-plugin-solid, vitest, commitlint, and husky. No runtime dependencies.
- **Host API surface consumed**: `api.slots.register`, `api.lifecycle.onDispose`, `api.ui.DialogSelect`, `api.ui.toast`, `api.kv`, `api.state.path`, `api.keymap.registerLayer`.
- **Open risks carried into design and tasks**: (1) the correct `SlotMode` for `sidebar_title` and the one-line height needed to avoid hiding the real sidebar title; (2) `@opentui/keymap` is absent from `node_modules`, so the `TuiKeymap` type resolves to `any`/unresolved and keymap use must be guarded.
- **Package naming**: the directory is `opencode-open-in-vscode` but the plugin covers several apps; the published package name must be decided during planning.
