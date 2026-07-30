## Context

The OpenCode TUI plugin and its original title-slot behavior have already been implemented. This design now governs the pending approved adjustment in task section 11 while retaining the package architecture originally mirrored from the sibling `opencode-openspec-task-tui` plugin (read-only reference at `../openspec-opencode-statusline`).

Facts verified against the reference and installed runtime before updating this design:

- The reference sub-agent-statusline plugin registers `sidebar_content` at order `90` in `references/sub-agent-statusline/src/tui.tsx:3028-3031`; its top-level contribution starts with the Subagents/Subagentes heading at lines `1755-1775`.
- Installed OpenTUI sorts slot plugins by ascending order in `@opentui/core/index.node.js:2107-2116`, so order `89` renders immediately before the reference contribution.
- `api.ui.DialogSelect` exists as `<Value = unknown>(props: TuiDialogSelectProps<Value>) => JSX.Element`, with `options`, `onMove`, and `onSelect`.
- `api.keymap` is typed as `TuiKeymap = Keymap<Renderable, KeyEvent>` imported from `@opentui/keymap`, and **`@opentui/keymap` is not present in `node_modules`**. The type therefore does not resolve to a concrete surface in this environment, so `registerLayer` cannot be relied on at the type level.
- `api.command` and the old `api.keys` command API are marked `@deprecated` in favour of `api.keymap.registerLayer`.

The approved adjustment moves the control out of `sidebar_title`. The plugin no longer participates in native title rendering or slot-mode behavior; it contributes only to `sidebar_content`.

## Goals / Non-Goals

**Goals:**

- A natural-width, single-row affordance at the start of sidebar content that opens the current project root in a desktop app without changing the native sidebar title.
- Two adjacent activation targets — text opens the favourite when one exists and otherwise opens the picker; the exact `↓` glyph always opens the picker, which also sets the favourite.
- Deterministic, unit-testable behaviour: all platform and process interaction behind injected seams so macOS-only hardware can still validate Linux and Windows branches.
- No failure mode that can crash or destabilise the host TUI.
- Package that builds and typechecks with the same toolchain as the reference plugin.

**Non-Goals:**

- User-configurable application lists.
- Opening individual files or inferring an active file.
- CI pipelines, semantic-release, or npm publishing automation.
- Verifying Linux and Windows behaviour on real hardware.

## Decisions

### D1 — Package name: `opencode-open-in-app`

The directory is `opencode-open-in-vscode`, but the plugin covers VS Code, Cursor, and the file explorer, and the app set may grow. The published name and the plugin `id` SHALL both be `opencode-open-in-app`. The directory and git remote name are left untouched; only package identity is normalised.

*Alternatives:* `opencode-open-in-vscode` (matches the directory but lies about scope, and would be wrong the moment Cursor is listed); `opencode-open-in-editor` (excludes the file explorer, which is one of the three MVP targets).

### D2 — Slot: `sidebar_content` at order 89; native title untouched

Register through `api.slots.register({ order: 89, slots: { sidebar_content(context) { ... } } })`. Do not register, replace, or render `sidebar_title`, and do not reproduce the host-provided title inside plugin content.

The placement is deterministic against the approved reference: the sub-agent-statusline plugin registers the same slot at order `90`, and installed OpenTUI sorts lower order first. Its content begins with the Subagents/Subagentes heading, so this plugin's order-89 row appears immediately before that heading when both plugins are active.

*Alternative:* continue contributing to `sidebar_title` and defensively render the native title — rejected because it makes the plugin responsible for a host-owned title and creates replacement/duplication risk.

### D3 — Natural-width adjacent text and `↓` regions

Text and arrow are separate focusable boxes in one natural-width row so the host's focus traversal treats them as distinct targets and mouse hit-testing is unambiguous. The row and text regions do not use flex-grow or a fixed-width/far-right arrow layout. The arrow is exactly `↓` and sits directly adjacent to the text. The text is exactly `Open in` when no displayed favourite exists, otherwise `Open in VS Code`, `Open in Cursor`, or `Open in File Explorer`.

Both regions use `onMouseDown` / `onMouseUp` and `onKeyDown`, reusing the reference's exact activation guards: primary button only, `enter` / `space` only, `preventDefault()` + `stopPropagation()` + `event.target?.focus()` on mouse activation. Pure activation predicates are exported as functions so they can be unit-tested without a renderer.

*Alternative:* a single box with x-coordinate hit-testing — rejected as brittle and untestable.

### D4 — `ProcessExecutor` seam, mirroring `src/openspec-process.ts`

A `ProcessExecutor` type `(request) => Promise<ProcessExecutionResult>` accepts a command and an argv array, with a default implementation wrapping `execFile(request.command, request.args, { timeout, windowsHide: true, encoding: "utf8" })`. No `shell`, no string interpolation of paths, and no project-derived options or extra argv entries. The executor's promise never rejects: spawn errors, non-zero exits, and timeouts are normalised into a `failure` discriminant (`"spawn" | "exit" | "timeout"`), and every call site is additionally wrapped in `try/catch` so a misbehaving injected executor cannot throw into the host.

### D4a — Each app owns a fixed argv template

Launch construction is data owned by the fixed app catalog, not generic concatenation. VS Code uses `code` and Cursor uses `cursor`; each editor template is fixed as either `[projectRoot]` or `["--", projectRoot]` when that CLI supports the option terminator. macOS file explorer uses `open` with `["-a", "Finder", "--", projectRoot]`, explicitly selecting Finder instead of generic content dispatch. Windows uses `explorer` with `[projectRoot]` and never concatenates the root with switches, commas, or command text. Linux retains the dependency-free `xdg-open` fallback with `[projectRoot]`; this delegates to the desktop's configured handler and does not guarantee a particular file manager. In every template, the validated root is inserted exactly once as one atomic argv value.

*Alternative:* require the root to be the only argv entry for every app — rejected because safe application invocation may require fixed arguments such as Finder selection or a supported `--` terminator.

### D4b — Resolve only a normalized absolute existing directory

`resolveProjectRoot` evaluates `api.state.path.directory`, `api.state.path.worktree`, and `process.cwd()` in that order, but priority applies only among valid candidates. A candidate must be a non-blank string containing an absolute path that normalizes to an existing directory. Candidate reads, normalization, filesystem checks, and `process.cwd()` are isolated so failures make only that candidate invalid; no exception escapes. The resolver returns no root when all candidates fail, and callers skip launch rather than passing an unvalidated path.

### D5 — Detection: cached once per activation, short timeout, platform injected

An `AppCatalog` built once per activation resolves the platform (injected as a `NodeJS.Platform`-shaped value, defaulting to `process.platform`), maps each app to its fixed command and argv template, probes availability through the same `ProcessExecutor` with a short timeout, and memoises the resulting detected list. Canonical order is fixed: VS Code, Cursor, file explorer. Startup performs the once-per-activation detection needed to resolve a persisted favourite; interactions reuse that result, and a fresh activation re-probes.

*Alternative:* probing on every interaction — rejected, it adds latency to every click for information that rarely changes within a session.

### D6 — Favourite in `api.kv`, single global key

Key shape follows the reference's namespacing convention but omits project identity entirely: `opencode-open-in-app:favourite:v1`. Reads validate the stored value against the known app identifiers and the startup detection result. Missing, malformed, unknown, or currently undetected values resolve to `undefined`; the first detected app is never treated as an implicit favourite. A thin adapter (`FavouriteAppPreference`) wraps the store so tests can pass a plain in-memory object, exactly as `accordion-preferences.ts` does with `PreferenceKeyValueStore`.

*Alternative:* per-project favourite — explicitly rejected by the confirmed brief.

### D6a — Reactive displayed favourite owned by `tui.tsx`

`src/tui.tsx` owns `createSignal<App | undefined>` for the displayed favourite. It starts as `undefined`, then startup sets it only when persistence resolves to a currently detected app. The picker accepts `onFavouriteChanged(app)` and invokes it after the selected app has been persisted; the callback updates the signal immediately. Selection continues to launch the selected app after persistence. Text activation reads the signal: when undefined it opens the picker without auto-selecting or launching the first detected app; when defined it launches that app. Arrow activation always opens the picker.

### D7 — Keymap registration behind a runtime guard

Because `@opentui/keymap` is absent, `api.keymap`'s surface is not statically trustworthy. Registration is attempted only when `api.keymap` and a callable `registerLayer` are both present, inside `try/catch`, and its returned disposer (if any) is added to the cleanup set. Deprecated `api.command` / `api.keys` are not used. If registration is skipped, mouse and keyboard activation on the control remain the full-featured path, so the command is strictly additive.

### D8 — Error reporting via `api.ui.toast` only

The control never renders inline error state, keeping it one line tall. Detection failures are silent (the app is simply absent). Launch failures and "no apps detected" produce a toast naming the app and the failure kind.

### D9 — Testing strategy: fakes plus a type-contract test

Unit tests inject a fake `ProcessExecutor`, a fake kv store, a fake platform string, and filesystem/path seams where needed, covering all three platform branches from macOS. Launch assertions cover each fixed argv template, atomic roots containing spaces or metacharacters, explicit Finder selection, Linux handler semantics, and safe Windows argv. Root-resolution assertions cover normalization, absolute-path enforcement, existing-directory enforcement, candidate priority among valid values, and non-throwing failures. A `test/unit/tui-api-contract.test.ts` mirrors the reference's contract test, using `expectTypeOf` against `TuiSlotPlugin`, `TuiPluginApi`, `TuiSlotProps<"sidebar_content">`, and `TuiDialogSelectProps` so a host upgrade that changes the consumed surfaces fails the suite. Renderer and interaction tests assert order `89`, no `sidebar_title` contribution, exact copy and adjacent natural-width layout, no-favourite picker behavior, the reactive transition after picker selection, and separate text/arrow activation. `tsc --noEmit` over sources and tests, the full test suite, and `tsup` build are executable gates. A final real-host E2E verifies composition and launching behavior that unit tests cannot prove.

### D10 — Module layout

`src/tui.tsx` (slot registration, component, and wiring), `src/interaction.ts` (activation predicates and press/release handlers), `src/picker.ts` (dialog, persistence, launch reporting), `src/keymap.ts` (guarded command registration), `src/apps.ts` (canonical app set, platform→fixed-launch-template mapping, detection and catalog), `src/process.ts` (`ProcessExecutor` and default `execFile` implementation), `src/project.ts` (validated project root resolution), and `src/favourite.ts` (kv-backed preference adapter). Keeping interaction, picker, keymap, resolution, catalog, process, and preference logic out of the `.tsx` file makes each behavior testable through its production seam.

## Risks / Trade-offs

- **Another plugin may change its order or leading content** → Order `89` is pinned against the verified reference's order `90` and current Subagents/Subagentes heading; the final real-host E2E verifies composition with both plugins installed.
- **`@opentui/keymap` is not installed, so `api.keymap` is not statically typed** → Command/keybinding is optional and guarded; the contract test asserts the guard compiles without relying on `registerLayer`'s signature. Fallback: ship without the command; the control still works.
- **Only macOS is verifiable here** → Platform is an injected value and all three branches are asserted by unit tests. Residual risk: `xdg-open` dispatch depends on the Linux desktop's configured handler and does not force a particular file manager; real-world `xdg-open` / `explorer` quirks remain unproven until someone runs them.
- **`explorer` on Windows exits non-zero even on success** → The Windows branch must not treat a non-zero exit from `explorer` as a user-facing failure; this is called out explicitly in the launching tasks and covered by a test.
- **Executable argument parsing differs by app and platform** → Fixed app-owned argv templates keep project data atomic; Finder is selected explicitly on macOS, editors may use a supported `--` terminator, and Windows avoids switch/comma concatenation. Residual CLI compatibility is covered by template-focused tests and the macOS E2E.
- **Host path state or cwd can be malformed, stale, relative, or inaccessible** → Only normalized absolute existing directories are accepted, every candidate check is non-throwing, and launch is skipped when the priority chain has no valid candidate.
- **Detection caching can go stale** → Accepted: an app installed mid-session is not picked up until the plugin reactivates. Re-probing per interaction was rejected as too costly.
- **Global favourite ignores per-project habits** → Accepted per the confirmed brief; the key is versioned (`:v1`) so a future per-project scheme can migrate.
- **No implicit fallback adds one interaction for first-time or stale preferences** → Accepted: `Open in ↓` makes the state explicit and text activation opens the picker without surprising the user by auto-launching an arbitrary detected app.
- **`code` / `cursor` CLI shims may be missing even when the GUI app is installed** → Accepted for the MVP: detection is command-based, so the app is reported as absent. Documented in the README rather than worked around.

## Open Questions

None blocking. Slot order and reference composition facts are verified in source/runtime and retained in the final real-host E2E task.
