## Context

The package identity is `opencode-open-in-app`, the canonical repository is `Angel-M-R/opencode-open-in-app`, and `main` currently carries the semantic-release sentinel version without CI or release workflows. The package builds, typechecks, tests, and packs locally, but npm currently has no public release. The maintainer has attested that the bounded macOS end-to-end check in `add-open-in-app-sidebar-plugin` task 11.10 passed. Its already-authorized task 11.10 bookkeeping change is accepted as prior candidate context but is not edited or extended by this change.

The staged rollout follows the proven, read-only `openspec-opencode-statusline` reference. Its key safety property is that `@semantic-release/npm` authenticates during `verifyConditions`, before commit analysis can determine that no release is needed. Therefore a complete release workflow may exist on canonical `main` before npm trust is configured, but it must remain dispatch-only and must not be run until the Trusted Publisher exists.

## Goals / Non-Goals

**Goals:**

- Publish a verified public `0.1.0` manually, then prove and activate OIDC-only semantic-release publishing from `main`.
- Keep automatic repository preparation, final verifier execution, and the primary-orchestrator-owned live rollout as separate phases, with explicit ordered gates inside the rollout.
- Re-run typecheck, tests, build, package inspection, and production audit immediately before every publication.
- Produce a matching tag and GitHub Release with generated notes for every published version.
- Make failures stop safely and recover forward without rewriting published versions.

**Non-Goals:**

- Functional plugin changes, runtime dependency changes, or modifications under `src/`, `test/`, build configuration, or `.vscode/`. Adding the repository-level `.vscode/` exclusion to `.gitignore` is the sole related exception and does not authorize mutation or publication of `.vscode/` contents.
- Release branches, prereleases, maintenance channels, a committed changelog, or tag-triggered publishing.
- Storing `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or another long-lived npm credential in GitHub.
- Treating planning-task completion as authorization to publish, tag, merge, dispatch or activate workflows, create GitHub Releases, or change npm/GitHub settings.

## Decisions

### D1 — Three execution phases with a controlled live runbook

Execution is split into three ownership domains:

1. **Automatic planned implementation:** `tasks.md` contains only repository-local preparation that can run section by section without maintainer interaction. Implementers may run focused lint, typecheck, and the minimum relevant tests, but must not run the full repository test suite, any build, package dry run, or the complete release validation set. They must not push, open or merge pull requests, publish, tag, create GitHub Releases, dispatch or activate workflows, inspect or change npm/GitHub settings or secrets, or perform any other external mutation.
2. **Mandatory final verification:** after every planned implementation checkbox is complete, the primary orchestrator invokes `openspec-verifier`. The verifier runs `pnpm typecheck`, the complete `pnpm test` suite, `pnpm build`, the configured npm-based package dry run (`npm pack --dry-run --json`) followed by the executable exact-file package allowlist assertion, and `pnpm audit --prod --audit-level moderate`, reviews the final diff and dormant workflow state, and binds its evidence to the exact candidate checkout. Live rollout cannot begin on a failed or stale verifier result.
3. **Post-verification live rollout:** the primary orchestrator follows the control sequence below. It obtains execution-time authorization at each boundary and does not dispatch these actions as automatic planned implementation tasks.

The live control sequence is strictly ordered:

1. **Integrate the verified preparation:** present the verifier evidence; obtain authorization to push, open a pull request, and merge the temporary-`0.1.0`, dispatch-only candidate; require CI to pass; confirm `release.yml` did not run. If the candidate contents differ from the verifier-bound checkout, stop and rerun `openspec-verifier` before publication authority can be requested.
2. **Publish and baseline `0.1.0`:** from clean canonical `main`, confirm the exact verified commit and package contents through the same npm-based dry run and executable allowlist assertion, obtain separate publication authorization, use interactive maintainer npm authentication, publish, and verify npm. Then obtain separate authorization for immutable tag `v0.1.0` and its generated-notes GitHub Release.
3. **Bootstrap dormant trust:** prepare, review, and authorize a non-releasing sentinel change to `0.0.0-development`; pass pull-request CI and merge while `release.yml` remains dispatch-only. After separate authorization, have the maintainer configure the package-scoped Trusted Publisher and inspect authentication-secret state; deleting any discovered secret requires its own authorization.
4. **Prove OIDC without releasing:** after explicit authorization, dispatch the dormant workflow exactly once. Its self-contained validations and OIDC `verifyConditions` must pass, semantic-release must report no relevant release, and no npm version, tag, or GitHub Release may be created.
5. **Activate and exercise releases:** prepare the genuine patch-worthy README/release-documentation correction together with the `push`-to-`main` trigger, pass pull-request CI, obtain push/PR authorization, and pause again for merge-and-publish authorization. The resulting accurate `fix:` merge exercises the first automated OIDC release, whose workflow revalidates its exact checkout before publishing.
6. **Verify final live state:** read-only verification confirms the public package and provenance, immutable tag, generated GitHub Release notes, workflow state, CI state, sentinel manifest version, and package contents. Any recovery mutation starts a new explicit authorization boundary.

This ordering is preferred over enabling the push trigger immediately because even a non-releasing commit reaches npm authentication before commit analysis. A permanent manual trigger is rejected because it allows merged and released states to diverge. Keeping rollout operations outside tracked implementation checkboxes prevents a section-by-section worker from silently crossing a live authorization boundary.

### D2 — Manual `0.1.0` establishes the immutable baseline

Repository preparation temporarily sets `package.json` to `0.1.0`. The final verifier must pass typecheck, tests, explicit build, the configured `npm pack --dry-run --json` command, an executable exact-file package allowlist assertion, and production audit on the exact publish candidate. Immediately before publication, the runbook confirms clean canonical `main` matches that verifier-bound candidate and its asserted package contents; any mismatch invalidates the evidence and requires another verifier pass. The maintainer performs interactive npm authentication and explicitly authorizes the irreversible publish. A matching `v0.1.0` tag is required so semantic-release starts from the correct baseline; a GitHub Release with generated notes keeps release outputs complete.

After the baseline is verified, a non-releasing setup change restores `0.0.0-development`. Semantic-release writes the real version only into the published artifact and does not commit release versions back to `main`. Tags and npm are the version sources of truth.

Creating a tag before a successful npm publish is rejected because it can claim a release that does not exist. Omitting the baseline tag is rejected because the first automated run could attempt to publish `0.1.0` again.

### D3 — One validation-only workflow and one self-verifying release workflow

`ci.yml` runs on pull requests and pushes with read-only contents permission. It provisions pnpm from `packageManager`, tests the Node `22.13` consumer floor, installs with `--frozen-lockfile --ignore-scripts`, and runs typecheck, tests, build, the npm-based package dry run plus executable exact-file allowlist assertion, and `pnpm audit --prod --audit-level moderate`.

`release.yml` repeats the same checks instead of trusting a prior CI result. It runs on a GitHub-hosted runner with Node 24, full history, serialized concurrency with cancellation disabled, and only then invokes semantic-release. Duplication is intentional: no package is published from a run that did not validate its own checkout.

A workflow-chain design is rejected because it couples publication to another run's state and makes the release evidence harder to audit.

### D4 — Semantic-release owns versions, tags, npm publication, and GitHub Releases

The package manifest contains semantic-release configuration for `main` with plugins ordered as commit analyzer, release-notes generator, npm, and GitHub. Conventional Commits determine major, minor, or patch changes. Tags and GitHub Releases are outputs, never triggers, and release notes are generated from the commits in the release.

No changelog or release commit is written back to the repository. Adding `@semantic-release/git` or a tag-triggered workflow is rejected because either would reintroduce version-maintenance commits or human-computed release state.

### D5 — npm authentication is package-scoped Trusted Publishing only

The release job requests `id-token: write`, uses the built-in `GITHUB_TOKEN` for GitHub outputs, and supplies no npm token. The npm Trusted Publisher must identify package `opencode-open-in-app`, owner `Angel-M-R`, repository `opencode-open-in-app`, and workflow `release.yml`. It is configured only after the package exists publicly and the dormant workflow exists on canonical `main`.

The no-release dispatch proves the OIDC exchange and plugin `verifyConditions` path without consuming a version. A stored npm token is rejected because it creates a rotatable secret and bypasses the requested trust boundary.

### D6 — Package metadata and local commit enforcement are release-blocking

The manifest must include the canonical repository URL, README homepage, issue tracker, relevant keywords, MIT license, and `publishConfig.access: public`. Its `pack:dry-run` script must use the working npm command `npm pack --dry-run --json`; it also provides an executable package-content assertion, `audit:prod`, and `release` scripts plus semantic-release dependencies. The existing commitlint/Husky setup remains, but `.husky/commit-msg` must be tracked as executable so local enforcement works after a normal install. The README documents npm installation, the staged release process, Conventional Commit effects, the sentinel version, authorization gates, and forward-only recovery.

These items are treated as correctness requirements rather than polish because registry identity, package visibility, release computation, and operator expectations depend on them.

### D7 — Planning records controls; only the primary orchestrator can cross them

Tracked tasks end at the verifier handoff and contain no approval or external-action checkbox. The primary orchestrator, not an implementation worker, owns the live runbook and obtains a fresh explicit authorization before each push or pull request, merge, publication, tag, GitHub Release, workflow dispatch or activation, npm website edit, secret inspection, secret deletion, or recovery mutation. Authorization for one action does not authorize the next action or a downstream equivalent. The runbook is control guidance, not executable authority.

### D8 — Failed-verification remediation is bounded by selected finding IDs

The 13 completed implementation checkboxes remain a historical record and are not reopened or extended into another automatic planned-task batch. The maintainer selected only these post-verification corrections: **Finding #1** replaces the unsupported pnpm pack invocation with the configured npm-based JSON dry run; **Finding #2** accepts the already-authorized prior sidebar task 11.10 bookkeeping change in candidate scope and adds the repository `.gitignore` exclusion for `.vscode/`, while forbidding any `.vscode/` content mutation or publication; and **Finding #3** adds an executable exact-file package allowlist assertion to both CI and release gates. These corrections require repository-local application and a fresh exact-candidate verifier pass; they grant no live-rollout authority.

The package allowlist is exactly `LICENSE`, `README.md`, `dist/tui.d.ts`, `dist/tui.js`, and `package.json`. The assertion must parse the npm dry-run JSON, fail on any missing or additional path, and be the command exercised by both workflows and final verification rather than relying on a human-readable listing.

## Risks / Trade-offs

- **A publish is immutable or difficult to reverse** → assert the exact tarball allowlist and pass all five verification gates from a clean checkout immediately before publishing; stop for explicit approval.
- **Dormant semantic-release is run before trust exists** → keep `workflow_dispatch` as the only trigger, document a hard no-dispatch gate, and verify no run occurred before Trusted Publisher confirmation.
- **A registry publish succeeds but tag or GitHub Release creation fails** → stop automation, preserve the published version, and reconcile only the missing output after explicit authorization; never rewrite the version.
- **An activated run publishes but fails afterward** → use serialized, non-cancelling runs; inspect npm before retrying, restore only missing release metadata if safe, and publish a later fix rather than republishing the same version.
- **A defective version reaches npm** → deprecate it when appropriate and publish a corrected version; `unpublish` is not the normal recovery path.
- **A production advisory blocks an unrelated release** → accept the block at moderate severity because releasing a known vulnerable shipped dependency is riskier than delaying.
- **Activation without a release-worthy commit would not prove npm publication** → activate with a real packaged-documentation correction merged as an accurate `fix:` commit, then verify the resulting patch release.
- **An automatic implementer runs expensive or mutating rollout work** → keep full-suite/build/package checks in `openspec-verifier`, keep live controls out of task checkboxes, and require the primary orchestrator to own every authorization boundary.

## Migration Plan

1. Preserve the 13 completed tracked repository-local implementation checkboxes, and apply only selected post-verification corrections #1–#3 without creating another automatic planned-task batch or taking external action.
2. Invoke `openspec-verifier` after those corrections; require all full test, build, npm-based package dry-run, executable allowlist, audit, diff, and dormant-workflow checks to pass on the exact corrected candidate.
3. Follow live control gate 1 to obtain authorization for repository integration, pass CI, and confirm canonical `main` matches the verified preparation without dispatching `release.yml`.
4. Follow live control gate 2 to obtain separate manual-publication and release-metadata authorizations, publish `0.1.0`, verify npm, and then create the baseline tag and GitHub Release.
5. Follow live control gate 3 to restore the sentinel through reviewed non-releasing work, preserve the dormant workflow, and obtain separately bounded authorization for Trusted Publisher and secret-state operations.
6. Follow live control gate 4 for the one authorized no-release OIDC preflight; stop on any failed check or unexpected release output.
7. Follow live control gate 5 for the reviewed activation/documentation patch and distinct push/PR and merge-and-publish authorizations; let the release workflow perform its own exact-checkout full validation.
8. Follow live control gate 6 to record final package, provenance, tag, GitHub Release, workflow, sentinel, and package-content evidence without further mutation.

Before the manual publish, rollback is a normal repository revert. After any npm publication, recovery is forward-only: do not rewrite or routinely unpublish the version; deprecate when warranted and publish a fix. Disabling Trusted Publisher and reverting workflow activation are allowed only after explicit authorization.

## Open Questions

None blocking. External account identity, npm 2FA/authentication, Trusted Publisher creation, and each mutating rollout step remain execution-time authorization checkpoints rather than planning assumptions.
