This checklist is the complete automatic planned-implementation scope. Implementers may run only focused lint, typecheck, and minimum relevant tests. They MUST NOT run the full repository test suite, any build, package dry run, production release validation set, or external command that pushes, opens or merges a pull request, publishes, tags, creates a GitHub Release, dispatches or activates a workflow, or inspects or changes npm/GitHub settings or secrets. After every checkbox is complete, implementation stops and the primary orchestrator invokes `openspec-verifier`; the post-verification live control sequence is defined in `design.md` and is not part of this executable checklist.

## 1. Package and Documentation Preparation

- [x] 1.1 Capture the baseline status and diff, confirm the maintainer's successful macOS E2E attestation is available as the release prerequisite, leave `openspec/changes/add-open-in-app-sidebar-plugin` unchanged, and establish a diff allowlist that excludes functional plugin files and `.vscode/`.
- [x] 1.2 Update `package.json` for the bootstrap with temporary version `0.1.0`, canonical repository/homepage/bugs metadata, relevant keywords, `publishConfig.access: public`, and scripts for package dry run, production audit, and semantic-release.
- [x] 1.3 Add compatible semantic-release development dependencies and configure semantic-release for `main` with commit analyzer, release-notes generator, npm, and GitHub plugins in that order; update `pnpm-lock.yaml` reproducibly without running the full test suite, a build, or package dry run.
- [x] 1.4 Update `README.md` with public npm installation and OpenCode configuration, temporary bootstrap and sentinel-version behavior, Conventional Commit release effects, staged OIDC rollout, verifier ownership, primary-orchestrator authorization boundaries, provenance verification, and forward-only recovery.
- [x] 1.5 Correct the tracked executable mode of `.husky/commit-msg`, verify it invokes commitlint with the supplied commit-message path, and run only the directly relevant valid/invalid hook checks.

## 2. CI and Dormant Release Automation

- [x] 2.1 Create `.github/workflows/ci.yml` for pull requests and pushes with read-only contents permission, pnpm from `packageManager`, Node 22.13, frozen script-free install, typecheck, complete tests, explicit build, package dry run, and moderate production audit; ensure CI has no publish or OIDC capability.
- [x] 2.2 Create complete `.github/workflows/release.yml` with `workflow_dispatch` as its only trigger, full checkout history, Node 24, frozen script-free install, the same five validation gates, serialized non-cancelling execution, `id-token: write`, semantic-release, and only the built-in `GITHUB_TOKEN` in its environment.
- [x] 2.3 Verify statically that CI and release commands use repository scripts consistently, the release job cannot reach semantic-release after a failed validation gate, and package tags and GitHub Releases are outputs rather than workflow triggers.
- [x] 2.4 Scan the manifest, lockfile, workflows, and documentation to confirm there is no `NPM_TOKEN`, `NODE_AUTH_TOKEN`, explicit provenance credential, tag trigger, push trigger in dormant `release.yml`, release-committed changelog/version plugin, or mutation under `.vscode/`.

## 3. Focused Validation and Verifier Handoff

- [x] 3.1 Run only focused static checks for the changed manifest, lockfile, semantic-release configuration, workflow structure, scripts, and documentation; do not execute `pnpm test`, `pnpm build`, `pnpm run pack:dry-run`, or any equivalent full-suite/build/package command.
- [x] 3.2 Run the minimum relevant commitlint/Husky tests and any focused typecheck or lint needed by the changed configuration, fixing only failures caused by this change.
- [x] 3.3 Review the complete diff against the allowlist, verify `release.yml` remains dispatch-only, confirm no product code, prior sidebar-change artifact, or `.vscode/` file changed, and record the focused-check evidence.
- [x] 3.4 Prepare the exact candidate checkout and handoff record for `openspec-verifier`, then stop without pushing, opening or merging a pull request, publishing, tagging, creating a GitHub Release, dispatching or activating a workflow, inspecting or changing npm/GitHub settings or secrets, or performing any other external mutation.

## Final Verification and Live Rollout (Not Planned Implementation Tasks)

After section 3 completes, the primary orchestrator must invoke `openspec-verifier` for the full typecheck, complete test suite, build, package inspection, production audit, diff, and dormant-workflow checks. Only a passing, current verifier result can unlock the ordered live rollout in `design.md`. The rollout steps are intentionally not checkboxes so the automatic planned-task loop cannot dispatch them or treat planning completion as authorization.

The first final-verification result is blocked. The 13 completed checkboxes above remain the historical implementation record and are not reopened or expanded into a new automatic planned-task batch. The maintainer selected only these mandatory post-verification corrections:

- **Finding #1 — npm-based dry run:** replace the unsupported configured pnpm pack invocation so `pack:dry-run` executes `npm pack --dry-run --json` successfully.
- **Finding #2 — candidate scope and `.gitignore`:** accept the already-authorized prior bookkeeping change to `openspec/changes/add-open-in-app-sidebar-plugin/tasks.md` task 11.10 as candidate context, and version the `.vscode/` exclusion in the repository `.gitignore`; do not modify, track, or publish any `.vscode/` content. For corrected-candidate review, this finding supersedes the narrower no-prior-artifact-change wording in completed tasks 1.1 and 3.3 without reopening either checkbox.
- **Finding #3 — executable package allowlist:** provide an executable assertion that parses the npm dry-run JSON and fails unless the file paths are exactly `LICENSE`, `README.md`, `dist/tui.d.ts`, `dist/tui.js`, and `package.json`; invoke that assertion in both CI and release package gates rather than merely listing contents.

After only these repository-local corrections are applied, rerun `openspec-verifier` on the exact corrected candidate, including both the npm-based dry run and executable allowlist assertion. Live rollout remains blocked until that fresh result passes, and these corrections grant no authority to publish, push, merge, tag, create a GitHub Release, dispatch or activate a workflow, mutate `.vscode/`, or change external state.
