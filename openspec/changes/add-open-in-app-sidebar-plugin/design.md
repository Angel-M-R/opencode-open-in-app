## Context

This repository is empty. The change creates an OpenCode TUI plugin from scratch, deliberately mirroring the verified structure of the sibling plugin `opencode-openspec-task-tui` (read-only reference at `../openspec-opencode-statusline`), whose patterns are known to build, typecheck, and load against the installed host types.

Facts verified against the reference's `node_modules` before writing this design:

- `@opencode-ai/plugin/dist/tui.d.ts` declares `sidebar_title` in `TuiHostSlotMap` with props `{ session_id: string; title: string; share_url?: string }`.
- `TuiSlotProps` carries an optional `mode?: SlotMode`, and `SlotMode` in `@opentui/core/plugins/types.d.ts` is the union `"append" | "replace" | "single_winner"`.
- `api.ui.DialogSelect` exists as `<Value = unknown>(props: TuiDialogSelectProps<Value>) => JSX.Element`, with `options`, `onMove`, and `onSelect`.
- `api.keymap` is typed as `TuiKeymap = Keymap<Renderable, KeyEvent>` imported from `@opentui/keymap`, and **`@opentui/keymap` is not present in `node_modules`**. The type therefore does not resolve to a concrete surface in this environment, so `registerLayer` cannot be relied on at the type level.
- `api.command` and the old `api.keys` command API are marked `@deprecated` in favour of `api.keymap.registerLayer`.

The reference plugin's own control uses `sidebar_content`, not `sidebar_title`, so the slot-mode and height behaviour of `sidebar_title` is genuinely unverified and is treated as a risk with a dedicated verification task.

## Goals / Non-Goals

**Goals:**

- One-line, always-cheap affordance in the sidebar title area that opens the current project root in a desktop app.
- Two distinct activation targets — label opens the favourite, chevron opens a picker that also sets the favourite.
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

### D2 — Slot: `sidebar_title` with mode chosen by verification, single-line rendering

Register through `api.slots.register({ order, slots: { sidebar_title(context, props) { ... } } })`. The renderer receives the host `title` prop, so the plugin can render the host title itself if the verified mode turns out to be `replace`-like. The starting hypothesis is `append` (host title stays, control is added); `single_winner` is rejected because it risks the plugin silently winning over the host title, and unconditional `replace` is rejected because it discards `title` unless the plugin re-renders it. Task section 4 verifies the actual semantics against the installed `SlotMode` and `TuiSlotProps` declarations and pins the choice.

Layout follows the reference's `CompactText` pattern: `height={1}`, `wrapMode="none"`, `truncate`, `selectable={false}`.

### D3 — Two adjacent `<box focusable>` regions, not one widget

Label and chevron are separate focusable boxes so the host's focus traversal treats them as distinct targets and mouse hit-testing is unambiguous. Both use `onMouseDown` / `onMouseUp` and `onKeyDown`, reusing the reference's exact activation guards: primary button only, `enter` / `space` only, `preventDefault()` + `stopPropagation()` + `event.target?.focus()` on mouse activation. Pure activation predicates are exported as functions so they can be unit-tested without a renderer.

*Alternative:* a single box with x-coordinate hit-testing — rejected as brittle and untestable.

### D4 — `ProcessExecutor` seam, mirroring `src/openspec-process.ts`

A `ProcessExecutor` type `(request) => Promise<ProcessExecutionResult>` with a default implementation wrapping `execFile(command, [directory], { timeout, windowsHide: true, encoding: "utf8" })`. No `shell`, no string interpolation of paths. The executor's promise never rejects: spawn errors, non-zero exits, and timeouts are normalised into a `failure` discriminant (`"spawn" | "exit" | "timeout"`), and every call site is additionally wrapped in `try/catch` so a misbehaving injected executor cannot throw into the host.

### D5 — Detection: cached once per activation, short timeout, platform injected

An `AppCatalog` built once per activation resolves the platform (injected as a `NodeJS.Platform`-shaped value, defaulting to `process.platform`), maps each app to its command, probes availability through the same `ProcessExecutor` with a short timeout, and memoises the resulting detected list. Canonical order is fixed: VS Code, Cursor, file explorer. Probing is lazy-but-once: the first interaction triggers it, the result is reused, and a fresh activation re-probes.

*Alternative:* probing on every interaction — rejected, it adds latency to every click for information that rarely changes within a session.

### D6 — Favourite in `api.kv`, single global key

Key shape follows the reference's namespacing convention but omits project identity entirely: `opencode-open-in-app:favourite:v1`. Reads validate the stored value against the known app identifiers; anything unusable falls back to the first *detected* app. Writes happen when the user selects from the picker. A thin adapter (`FavouriteAppPreference`) wraps the store so tests can pass a plain in-memory object, exactly as `accordion-preferences.ts` does with `PreferenceKeyValueStore`.

*Alternative:* per-project favourite — explicitly rejected by the confirmed brief.

### D7 — Keymap registration behind a runtime guard

Because `@opentui/keymap` is absent, `api.keymap`'s surface is not statically trustworthy. Registration is attempted only when `api.keymap` and a callable `registerLayer` are both present, inside `try/catch`, and its returned disposer (if any) is added to the cleanup set. Deprecated `api.command` / `api.keys` are not used. If registration is skipped, mouse and keyboard activation on the control remain the full-featured path, so the command is strictly additive.

### D8 — Error reporting via `api.ui.toast` only

The control never renders inline error state, keeping it one line tall. Detection failures are silent (the app is simply absent). Launch failures and "no apps detected" produce a toast naming the app and the failure kind.

### D9 — Testing strategy: fakes plus a type-contract test

Unit tests inject a fake `ProcessExecutor`, a fake kv store, and a fake platform string, covering all three platform branches from macOS. A `test/unit/tui-api-contract.test.ts` mirrors the reference's contract test, using `expectTypeOf` against `TuiSlotPlugin`, `TuiPluginApi`, `TuiSlotProps<"sidebar_title">`, `SlotMode`, and `TuiDialogSelectProps` so that a host upgrade that changes these surfaces fails the suite. `tsc --noEmit` over sources and tests plus `tsup` build are the executable gates. No integration suite in this change — there is no deterministic way to assert a real GUI app opened.

### D10 — Module layout

`src/tui.tsx` (slot registration, components, activation predicates, wiring), `src/apps.ts` (canonical app set, platform→command mapping, detection and catalog), `src/process.ts` (`ProcessExecutor` and default `execFile` implementation), `src/project.ts` (project root resolution), `src/favourite.ts` (kv-backed preference adapter). Keeping resolution, catalog, process, and preference logic out of the `.tsx` file is what makes them testable without a renderer.

## Risks / Trade-offs

- **`sidebar_title` slot mode and height are unverified** → Dedicated verification task reads the installed `SlotMode` and `TuiHostSlotMap`/`TuiSlotProps` declarations, encodes the chosen mode in the contract test, and enforces one-line rendering. Fallback: if no mode preserves the host title, render the host `title` prop ourselves inside the slot before the control.
- **`@opentui/keymap` is not installed, so `api.keymap` is not statically typed** → Command/keybinding is optional and guarded; the contract test asserts the guard compiles without relying on `registerLayer`'s signature. Fallback: ship without the command; the control still works.
- **Only macOS is verifiable here** → Platform is an injected value and all three branches are asserted by unit tests. Residual risk: real-world `xdg-open` / `explorer` quirks remain unproven until someone runs it.
- **`explorer` on Windows exits non-zero even on success** → The Windows branch must not treat a non-zero exit from `explorer` as a user-facing failure; this is called out explicitly in the launching tasks and covered by a test.
- **Detection caching can go stale** → Accepted: an app installed mid-session is not picked up until the plugin reactivates. Re-probing per interaction was rejected as too costly.
- **Global favourite ignores per-project habits** → Accepted per the confirmed brief; the key is versioned (`:v1`) so a future per-project scheme can migrate.
- **`code` / `cursor` CLI shims may be missing even when the GUI app is installed** → Accepted for the MVP: detection is command-based, so the app is reported as absent. Documented in the README rather than worked around.

## Open Questions

None blocking. The two carried risks above are resolved by verification tasks against installed type definitions rather than by further discussion.
