## 1. Scaffold and Build Configuration

- [x] 1.1 Create `package.json` named `opencode-open-in-app` (per design D1) with `"type": "module"`, `packageManager: pnpm`, `engines.node >= 22.13`, `main`/`types`/`exports` pointing at `./dist/tui.js` and `./dist/tui.d.ts`, and `files: ["dist", "README.md"]`. No `dependencies` field.
- [x] 1.2 Declare peer dependencies `@opencode-ai/plugin`, `@opentui/core`, `@opentui/solid`, `solid-js` with the same ranges as the reference plugin, and add the matching dev dependencies plus `typescript`, `tsup`, `esbuild-plugin-solid`, `vitest`, `@types/node`, `@commitlint/cli`, `@commitlint/config-conventional`, `husky`. Do NOT add semantic-release or any CI dependency.
- [x] 1.3 Add scripts: `build` (tsup), `typecheck` (`tsc --noEmit -p tsconfig.test.json`), `test` / `test:unit` (`vitest run test/unit`), `test:watch`, `prepare` (husky), `prepack` (build).
- [x] 1.4 Create `tsconfig.json` with `module`/`moduleResolution` `NodeNext`, `target` ES2022, `strict: true`, `jsx: "react-jsx"`, `jsxImportSource: "@opentui/solid"`, `declaration`, `rootDir: src`, `outDir: dist`, excluding `test`.
- [x] 1.5 Create `tsconfig.test.json` extending the base config to also include `test/**`, and `vitest.config.ts` for the unit suite.
- [x] 1.6 Create `tsup.config.ts`: entry `{ tui: "src/tui.tsx" }`, `format: ["esm"]`, `target: "node22"`, `dts` for the same entry, `bundle: true`, `splitting: false`, `clean: true`, externals for `@opencode-ai/plugin`, `@opencode-ai/plugin/tui`, `@opentui/core`, `@opentui/solid`, `solid-js`, and `esbuildPlugins: [solidPlugin({ solid: { generate: "universal", moduleName: "@opentui/solid" } })]`.
- [x] 1.7 Add `commitlint.config.js` with `@commitlint/config-conventional`, a `.husky/commit-msg` hook running commitlint, `.gitignore`, `LICENSE`, and a minimal `README.md` using the `opencode-open-in-app` identity.
- [x] 1.8 Add a placeholder `src/tui.tsx` exporting a `TuiPluginModule` with id `opencode-open-in-app` and a no-op `tui`, then run `pnpm install`, `pnpm typecheck`, and `pnpm build` and confirm all three exit zero so later sections have a working gate.

## 2. Project Root Resolution

- [x] 2.1 Implement `src/project.ts` exporting `resolveProjectRoot(api)` with the chain `api.state.path.directory` → `api.state.path.worktree` → `process.cwd()`, treating non-strings and whitespace-only strings as absent (mirror the reference's `nonEmptyString` helper).
- [x] 2.2 Add `test/unit/project.test.ts` covering: directory present; directory blank with worktree present; both absent falling back to cwd; non-string candidates (number, `null`, object) skipped.
- [x] 2.3 Assert in tests that resolution never returns an empty string and never reads any file-level session state.

## 3. Process Execution and App Catalog

- [x] 3.1 Implement `src/process.ts` with `ProcessRequest`, `ProcessExecutionResult` (including a `failure` discriminant of `"spawn" | "exit" | "timeout"`), the `ProcessExecutor` type, and a default implementation wrapping `execFile(command, [directory], { cwd, encoding: "utf8", timeout, windowsHide: true })` that never rejects.
- [x] 3.2 Implement `src/apps.ts` with the canonical app list (VS Code → `code`, Cursor → `cursor`, file explorer → platform command) and `resolveExplorerCommand(platform)` returning `open` for `darwin`, `xdg-open` for `linux`, `explorer` for `win32`, and `undefined` otherwise.
- [x] 3.3 Implement `createAppCatalog({ executor, platform, timeoutMs })` that probes each app's availability at most once per instance, memoises the detected list in canonical order, and swallows all probe errors and timeouts as "not detected".
- [x] 3.4 Implement `launchApp(app, directory, deps)` that calls the executor with the directory as the single argv entry, wraps the call in `try/catch`, and returns a result describing success or the failure kind — never throwing.
- [x] 3.5 Special-case Windows `explorer`: a non-zero exit from `explorer` must NOT be reported as a failure (see design Risks).
- [x] 3.6 Add `test/unit/apps.test.ts` with a fake executor and fake platform covering: each platform's explorer command; unsupported platform hides the explorer; detection runs once across repeated calls; probe timeout → not detected; new catalog instance re-probes.
- [x] 3.7 Add `test/unit/process.test.ts` (or extend `apps.test.ts`) covering launch outcomes: success, spawn failure, non-zero exit, timeout, executor rejecting, executor throwing synchronously — asserting no exception escapes and that paths containing spaces and `;`/`&`/`$` are passed as one argv entry with no shell.

## 4. Sidebar Title Slot Registration (RISK: slot mode and height)

- [ ] 4.1 Read the installed `@opencode-ai/plugin/dist/tui.d.ts` and `@opentui/core/plugins/types.d.ts` in `node_modules` and record, in a short comment in `src/tui.tsx`, the exact `TuiHostSlotMap["sidebar_title"]` props and the `SlotMode` union members as they exist in the installed version.
- [ ] 4.2 Decide and pin the slot `mode` based on that reading, starting from the `append` hypothesis in design D2. If the chosen mode does not preserve the host title, render the host-provided `title` prop inside the slot before the control.
- [ ] 4.3 Implement `api.slots.register({ order, slots: { sidebar_title(context, props) {...} } })` inside `createRoot`, with an idempotent `dispose` registered through `api.lifecycle.onDispose` plus a cleanup set, mirroring the reference's activation shape.
- [ ] 4.4 Render the control as a single line: outer box `height={1}`, text with `wrapMode="none"`, `truncate`, `selectable={false}`, themed via `context.theme.current`.
- [ ] 4.5 Extend `test/unit/tui-api-contract.test.ts` with `expectTypeOf` assertions that the plugin object satisfies `TuiSlotPlugin`, that the `sidebar_title` slot props include `session_id` and `title`, and that the pinned mode value is assignable to `SlotMode` — so a host upgrade that changes these fails the suite.
- [ ] 4.6 Manually verify in a running OpenCode session that the real sidebar title is still visible and the control occupies exactly one line; if not, apply the design fallback and update task 4.2's pinned mode.

## 5. Activation Regions and Interaction

- [ ] 5.1 Implement exported pure predicates `activateFromKey(event, activate)` (accepts only `enter` / `space`, calls `preventDefault` + `stopPropagation`) and `activateFromMouse(event, activate)` (primary button only, focuses `event.target`), copied in spirit from the reference's helpers.
- [ ] 5.2 Render two adjacent `<box focusable>` regions — label and chevron — each wired to `onMouseDown`, `onMouseUp`, and `onKeyDown`.
- [ ] 5.3 Wire label activation to launch the effective favourite with the resolved project root, without opening any dialog.
- [ ] 5.4 Wire chevron activation to open the picker without launching anything until a selection is made.
- [ ] 5.5 Add `test/unit/interaction.test.ts` asserting: non-primary mouse buttons are ignored; keys other than `enter`/`space` are not consumed; handled events have default prevented and propagation stopped; label and chevron trigger different actions.

## 6. Application Picker Dialog

- [ ] 6.1 Render the picker with `api.ui.DialogSelect`, options built from the detected apps in canonical order.
- [ ] 6.2 On `onSelect`, persist the chosen app as the favourite and launch it with the resolved project root.
- [ ] 6.3 On dismissal, perform no launch and leave the stored favourite unchanged.
- [ ] 6.4 When no apps are detected, show an `api.ui.toast` instead of opening an empty picker, and make label activation a no-op launch-wise.
- [ ] 6.5 Add unit tests for select-then-launch-and-persist, dismissal changing nothing, and the empty-detection path, using a fake dialog surface and fake kv.

## 7. Favourite App Preference

- [ ] 7.1 Implement `src/favourite.ts` with a `FavouriteAppPreference` adapter over a minimal `{ get, set }` store interface, using the single global key `opencode-open-in-app:favourite:v1` with no project, worktree, or session identity in it.
- [ ] 7.2 Validate reads against the known app identifiers; on missing, non-string, empty, object, or unknown values, fall back to the first *detected* app without throwing.
- [ ] 7.3 Fall back to the first detected app when the stored favourite is valid but that app is not detected on this machine.
- [ ] 7.4 Add `test/unit/favourite.test.ts` with an in-memory store covering: nothing stored; malformed values; unknown identifier; stored-but-undetected; write-then-read round trip; and that the key is byte-for-byte identical for two different project directories.

## 8. Command and Keybinding (RISK: untyped @opentui/keymap)

- [ ] 8.1 Confirm against `node_modules` that `@opentui/keymap` is absent and that `TuiKeymap` therefore does not resolve to a usable surface; record the finding in a comment next to the guard.
- [ ] 8.2 Implement a guarded registration that runs only when `api.keymap` exists and `api.keymap.registerLayer` is callable, wrapped in `try/catch`, registering the "open project root with favourite app" command and its binding.
- [ ] 8.3 Add any disposer returned by registration to the cleanup set so it is released on dispose. Do not use the deprecated `api.command` or `api.keys` APIs.
- [ ] 8.4 Make the dispatched command perform exactly the same action as label activation by routing both through one shared function.
- [ ] 8.5 Add unit tests for keymap present (registers and disposes) and keymap absent or non-callable (skips silently, control still works), and add a contract-test assertion that the guard compiles without depending on `registerLayer`'s signature.

## 9. Error Reporting

- [ ] 9.1 Route every launch failure (spawn, non-zero exit except Windows `explorer`, timeout, executor rejection) to `api.ui.toast` with a message naming the app and the failure kind.
- [ ] 9.2 Keep detection failures silent — an undetected app is simply absent from the picker.
- [ ] 9.3 Assert in tests that a successful launch produces no error toast, and that no code path lets an exception escape into the host.

## 10. Final Validation

- [ ] 10.1 Run `pnpm typecheck` and confirm exit code 0.
- [ ] 10.2 Run `pnpm test` and confirm the unit suite passes.
- [ ] 10.3 Run `pnpm build` and confirm `dist/tui.js` and `dist/tui.d.ts` are emitted with the host and Solid packages left external.
- [ ] 10.4 Confirm `npm pack --dry-run` includes only `dist` and `README.md`, and that no CI workflow or release automation exists in the repository.
- [ ] 10.5 Load the built plugin in a real OpenCode session on macOS and confirm end to end: control renders on one line, host title still visible, label opens the project root in the favourite app, chevron opens the picker and updates the favourite.
