## Why

While working inside an OpenCode session, opening the current project in a graphical editor or file manager otherwise requires leaving the TUI and retyping the project path in a shell. The plugin was initially implemented in the native title slot; this approved adjustment preserves the small sidebar affordance while moving it into composable sidebar content and making first-use behavior explicit and non-surprising.

## What Changes

- Introduce a new OpenCode TUI plugin package in this repository, scaffolded from the verified patterns of the sibling `opencode-openspec-task-tui` plugin (pnpm, TypeScript NodeNext, `tsup` ESM build with `esbuild-plugin-solid` in `universal` mode, vitest, commitlint + husky).
- Register a natural-width, single-row control in the host `sidebar_content` slot at order `89` via `api.slots.register`, immediately before the reference sub-agent-statusline contribution at order `90`, and tear it down through `api.lifecycle.onDispose`. The native sidebar title remains untouched.
- The control is two adjacent focusable regions:
  - **Text** — renders exactly `Open in` with no favourite, or `Open in VS Code`, `Open in Cursor`, or `Open in File Explorer` for a persisted and currently detected favourite. Activating it opens the picker when there is no favourite, or opens the project root with the favourite when one exists.
  - **Arrow** — renders the exact adjacent glyph `↓` and always opens an `api.ui.DialogSelect` picker of detected apps; choosing one launches it, persists it, and reactively updates the displayed favourite.
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

- `sidebar-open-in-app-control`: The order-89 `sidebar_content` control — its native-title preservation contract, natural-width copy, adjacent text/`↓` activation regions, reactive display state, keyboard and mouse activation, visibility rules, and app-picker dialog behaviour.
- `project-root-resolution`: How the directory handed to an external app is resolved from the TUI plugin API, with its fallback chain and rejection of empty values.
- `desktop-app-launching`: Detection of the MVP app set per platform, caching of detection per activation, non-throwing launch through an injectable executor, and user-visible error reporting.
- `favourite-app-preference`: Globally scoped persistence of the favourite app in `api.kv`, including corrupt, unknown, missing, or no-longer-detected stored values and the rule that none of those states creates an effective favourite.
- `plugin-packaging`: The package layout, build and type configuration, dependency policy, and validation commands that make the plugin loadable by OpenCode.

### Modified Capabilities

None — this repository has no existing specs.

## Impact

- **Implementation delta** (performed by a later apply phase, not this planning update): `src/tui.tsx`, favourite resolution, picker wiring, and affected unit/type-contract tests. Existing package and build configuration remain in place.
- **Dependencies**: peer dependencies on `@opencode-ai/plugin`, `@opentui/core`, `@opentui/solid`, and `solid-js`; dev dependencies for TypeScript, tsup, esbuild-plugin-solid, vitest, commitlint, and husky. No runtime dependencies.
- **Host API surface consumed**: `api.slots.register`, `api.lifecycle.onDispose`, `api.ui.DialogSelect`, `api.ui.toast`, `api.kv`, `api.state.path`, `api.keymap.registerLayer`.
- **Verified host placement**: the reference sub-agent-statusline plugin registers `sidebar_content` at order `90` (`references/sub-agent-statusline/src/tui.tsx:3028-3031`) and starts its top-level content with the Subagents/Subagentes heading (`references/sub-agent-statusline/src/tui.tsx:1755-1775`); installed OpenTUI sorts lower order first (`@opentui/core/index.node.js:2107-2116`), so order `89` places this control immediately before it.
- **Open risk carried into design and tasks**: `@opentui/keymap` is absent from `node_modules`, so the `TuiKeymap` type resolves to `any`/unresolved and keymap use must be guarded.
- **Package naming**: the directory is `opencode-open-in-vscode` but the plugin covers several apps; the published package name must be decided during planning.
