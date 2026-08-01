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

- [x] 2.1 Implement `src/project.ts` exporting a non-throwing `resolveProjectRoot(api)` with the chain `api.state.path.directory` → `api.state.path.worktree` → `process.cwd()`, selecting the first candidate that is a non-blank absolute path which normalizes to an existing directory; isolate candidate reads, normalization, filesystem checks, and `process.cwd()` failures, and return no root when none is valid.
- [x] 2.2 Add `test/unit/project.test.ts` covering: valid directory priority; invalid directory with valid worktree; both host paths invalid with valid cwd; non-string, blank, relative, nonexistent, and non-directory candidates skipped; normalized absolute output; validation and cwd failures swallowed; all candidates invalid returning no root.
- [x] 2.3 Assert in tests that resolution never returns an empty, relative, nonexistent, or non-directory path; never throws; never reads file-level session state; and prevents launch when no valid root is available.

## 3. Process Execution and App Catalog

- [x] 3.1 Implement `src/process.ts` with `ProcessRequest` carrying a command and argv array, `ProcessExecutionResult` (including a `failure` discriminant of `"spawn" | "exit" | "timeout"`), the `ProcessExecutor` type, and a default implementation wrapping `execFile(request.command, request.args, { cwd, encoding: "utf8", timeout, windowsHide: true })` with no shell that never rejects.
- [x] 3.2 Implement `src/apps.ts` with the canonical app list and app-owned fixed launch templates: VS Code (`code`) and Cursor (`cursor`) use `[projectRoot]` or supported `["--", projectRoot]`; macOS file explorer uses `open` with `["-a", "Finder", "--", projectRoot]`; Linux uses dependency-free `xdg-open` with `[projectRoot]` as platform-handler dispatch without claiming a specific file manager; Windows uses `explorer` with safe `[projectRoot]` semantics; unsupported platforms omit the explorer.
- [x] 3.3 Implement `createAppCatalog({ executor, platform, timeoutMs })` that probes each app's availability at most once per instance, memoises the detected list in canonical order, and swallows all probe errors and timeouts as "not detected".
- [x] 3.4 Implement `launchApp(app, directory, deps)` so the app's fixed template inserts the validated directory exactly once as one atomic argv value, with no project-derived options or extra entries; wrap execution in `try/catch` and return success or the failure kind without throwing.
- [x] 3.5 Special-case Windows `explorer`: a non-zero exit from `explorer` must NOT be reported as a failure (see design Risks).
- [x] 3.6 Add `test/unit/apps.test.ts` with a fake executor and fake platform covering: each app's fixed command and argv template, explicit Finder selection on macOS, Linux platform-handler dispatch semantics, safe Windows explorer argv, optional supported editor `--`, unsupported platform hiding the explorer, detection once across repeated calls, probe timeout → not detected, and a new catalog instance re-probing.
- [x] 3.7 Add `test/unit/process.test.ts` (or extend `apps.test.ts`) covering launch outcomes: success, spawn failure, non-zero exit, timeout, executor rejecting, executor throwing synchronously — asserting no exception escapes and that paths containing spaces and `;`/`&`/`$` remain one atomic argv value in the fixed template with no shell.

## 4. Historical Sidebar Title Slot Implementation (Superseded by Section 11)

Tasks 4.1–4.5 record completed implementation history. They are not current requirements and are replaced by the approved `sidebar_content` work in section 11.

- [x] 4.1 Recorded the installed host slot props and `SlotMode` union used to assess the original title-slot implementation; section 11 replaces that consumed slot contract.
- [x] 4.2 Verified and recorded that slot mode is host-owned and plugin-level mode is discarded; the current design avoids native-title participation entirely rather than retaining any manual-title fallback.
- [x] 4.3 Implemented the original slot registration inside `createRoot` with idempotent lifecycle disposal and a cleanup set; section 11 migrates that registration to the approved slot and order.
- [x] 4.4 Render the control as a single line: outer box `height={1}`, text with `wrapMode="none"`, `truncate`, `selectable={false}`, themed via `context.theme.current`.
- [x] 4.5 Added the original `TuiSlotPlugin` and consumed-slot type-contract assertions; section 11 replaces obsolete title-slot assertions with the `sidebar_content` contract.

## 5. Activation Regions and Interaction

Tasks 5.2–5.4 record the completed pre-adjustment interaction and are superseded where section 11 differs.

- [x] 5.1 Implement exported pure predicates `activateFromKey(event, activate)` (accepts only `enter` / `space`, calls `preventDefault` + `stopPropagation`) and `activateFromMouse(event, activate)` (primary button only, focuses `event.target`), copied in spirit from the reference's helpers.
- [x] 5.2 Render two adjacent `<box focusable>` regions — label and chevron — each wired to `onMouseDown`, `onMouseUp`, and `onKeyDown`.
- [x] 5.3 Wire label activation to launch the effective favourite with the resolved project root, without opening any dialog.
- [x] 5.4 Wire chevron activation to open the picker without launching anything until a selection is made.
- [x] 5.5 Add `test/unit/interaction.test.ts` asserting: non-primary mouse buttons are ignored; keys other than `enter`/`space` are not consumed; handled events have default prevented and propagation stopped; label and chevron trigger different actions.

## 6. Application Picker Dialog

- [x] 6.1 Render the picker with `api.ui.DialogSelect`, options built from the detected apps in canonical order.
- [x] 6.2 On `onSelect`, persist the chosen app as the favourite and launch it with the resolved project root.
- [x] 6.3 On dismissal, perform no launch and leave the stored favourite unchanged.
- [x] 6.4 When no apps are detected, show an `api.ui.toast` instead of opening an empty picker, and make label activation a no-op launch-wise.
- [x] 6.5 Add unit tests for select-then-launch-and-persist, dismissal changing nothing, and the empty-detection path, using a fake dialog surface and fake kv.

## 7. Favourite App Preference

Tasks 7.2–7.4 record the completed pre-adjustment fallback and are superseded by section 11's no-implicit-favourite behavior.

- [x] 7.1 Implement `src/favourite.ts` with a `FavouriteAppPreference` adapter over a minimal `{ get, set }` store interface, using the single global key `opencode-open-in-app:favourite:v1` with no project, worktree, or session identity in it.
- [x] 7.2 Validate reads against the known app identifiers; on missing, non-string, empty, object, or unknown values, fall back to the first *detected* app without throwing.
- [x] 7.3 Fall back to the first detected app when the stored favourite is valid but that app is not detected on this machine.
- [x] 7.4 Add `test/unit/favourite.test.ts` with an in-memory store covering: nothing stored; malformed values; unknown identifier; stored-but-undetected; write-then-read round trip; and that the key is byte-for-byte identical for two different project directories.

## 8. Command and Keybinding (RISK: untyped @opentui/keymap)

- [x] 8.1 Confirm against `node_modules` that `@opentui/keymap` is absent and that `TuiKeymap` therefore does not resolve to a usable surface; record the finding in a comment next to the guard.
- [x] 8.2 Implement a guarded registration that runs only when `api.keymap` exists and `api.keymap.registerLayer` is callable, wrapped in `try/catch`, registering the "open project root with favourite app" command and its binding.
- [x] 8.3 Add any disposer returned by registration to the cleanup set so it is released on dispose. Do not use the deprecated `api.command` or `api.keys` APIs.
- [x] 8.4 Make the dispatched command perform exactly the same action as label activation by routing both through one shared function.
- [x] 8.5 Add unit tests for keymap present (registers and disposes) and keymap absent or non-callable (skips silently, control still works), and add a contract-test assertion that the guard compiles without depending on `registerLayer`'s signature.

## 9. Error Reporting

- [x] 9.1 Route every launch failure (spawn, non-zero exit except Windows `explorer`, timeout, executor rejection) to `api.ui.toast` with a message naming the app and the failure kind.
- [x] 9.2 Keep detection failures silent — an undetected app is simply absent from the picker.
- [x] 9.3 Assert in tests that a successful launch produces no error toast, and that no code path lets an exception escape into the host.

## 10. Final Validation

- [x] 10.1 Run `pnpm typecheck` and confirm exit code 0.
- [x] 10.2 Run `pnpm test` and confirm the unit suite passes.
- [x] 10.3 Run `pnpm build` and confirm `dist/tui.js` and `dist/tui.d.ts` are emitted with the host and Solid packages left external.
- [x] 10.4 Confirm `npm pack --dry-run` includes only `dist` and `README.md`, and that no CI workflow or release automation exists in the repository.

## 11. Approved Sidebar Content Behavior Adjustment

- [x] 11.1 Replace the `sidebar_title` contribution with exactly one `sidebar_content` contribution at order `89`; remove manual/native-title fallback logic and update API-contract assertions so the plugin neither registers nor renders `sidebar_title`.
- [x] 11.2 Render the control as one natural-width row with no flex-grow or fixed far-right arrow layout, using exact copy `Open in ↓` without a favourite and `Open in VS Code ↓`, `Open in Cursor ↓`, or `Open in File Explorer ↓` with a favourite; keep the exact `↓` glyph directly adjacent to the text.
- [x] 11.3 Make `createSignal<App | undefined>` in `src/tui.tsx` own the displayed favourite; on startup set it only from a truly persisted and currently detected app, and remove every fallback that treats the first detected app as an effective favourite.
- [x] 11.4 Have the picker call `onFavouriteChanged(app)` after selection and persistence so the control updates reactively; retain launch-on-selection and ensure dismissal changes neither persisted nor displayed state.
- [x] 11.5 Route text activation to launch the project root only when a displayed favourite exists and otherwise open the picker without auto-selection or auto-launch; route `↓` activation to the picker in all states.
- [x] 11.6 Update unit and contract tests for `sidebar_content` order `89`, the absence of a `sidebar_title` contribution, preserved native-title ownership, exact copy and natural-width adjacent layout, no-favourite behavior, reactive favourite transition, and separate text/arrow activation.
- [x] 11.7 Run `pnpm typecheck` and confirm exit code 0.
- [x] 11.8 Run the full `pnpm test` suite and confirm exit code 0.
- [x] 11.9 Run `pnpm build` and confirm exit code 0 with the expected `dist/tui.js` and `dist/tui.d.ts` outputs.
- [x] 11.10 Load the built plugin with the reference sub-agent-statusline plugin in a real OpenCode session on macOS and confirm end to end: the order-89 natural-width row appears immediately before the order-90 Subagents/Subagentes heading, the native sidebar title is untouched, the exact adjacent copy is correct in both favourite states, text activation follows favourite/no-favourite behavior, `↓` always opens the picker, and a selection launches, persists, and reactively updates the displayed favourite.
