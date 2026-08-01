## Why

`opencode-open-in-app` is ready for distribution but is not yet available from npm and has no repository-level validation or repeatable release path. The maintainer has completed the remaining macOS end-to-end validation, so the next step is a staged, credential-free rollout that publishes `0.1.0` manually and then makes verified releases from `main` routine and auditable. Planning must also keep automatic repository implementation, final verification, and authorized live rollout as separate execution phases.

## What Changes

- Prepare `opencode-open-in-app` for public npm publication with complete registry metadata, public access configuration, release scripts and dependencies, documentation, and an executable Husky `commit-msg` hook.
- Add CI that validates typecheck, tests, build/package contents through an executable exact-file allowlist assertion, and the production dependency audit on pull requests and pushes without publishing.
- Add a fully defined semantic-release workflow in a dormant state, using npm Trusted Publishing OIDC and no `NPM_TOKEN`.
- Limit the automatic planned-task loop to repository-local preparation and focused validation; it cannot run the full repository test suite or any build and cannot perform or seek approval for external mutations.
- Require a final `openspec-verifier` pass after all planned implementation tasks, including typecheck, the complete test suite, build, an npm-based package dry run plus executable package-content allowlist assertion, and production audit, before live rollout starts.
- Keep the ordered live rollout in a post-verification control runbook owned by the primary orchestrator: authorized repository integration; manual `0.1.0` publication and matching release baseline; dormant workflow bootstrap; Trusted Publisher configuration; no-release OIDC preflight; activation on `main`; and final public-release verification.
- Re-run typecheck, tests, build, the npm-based package dry run and executable allowlist assertion, and production audit through the final verifier for the manual publish candidate and within every automated release workflow.
- Derive versions and generated notes from Conventional Commits, publish to npm, and create matching git tags and GitHub Releases as release outputs.
- Document forward-only recovery: deprecate a defective version when appropriate and publish a fix instead of rewriting versions or using unpublish as the normal path.
- Require the primary orchestrator to obtain explicit authorization before publishing, pushing or merging, tagging, creating GitHub Releases, dispatching or activating workflows, changing npm settings, inspecting or deleting secrets, or performing any other irreversible external mutation; none of these are automatic implementation tasks.

## Capabilities

### New Capabilities

- `continuous-integration`: Validation-only GitHub Actions checks for typecheck, tests, build/package contents, and production dependency audit on pull requests and pushes.
- `npm-release-automation`: Staged public npm bootstrap and semantic-release automation from `main` using Trusted Publishing OIDC, including metadata, release outputs, safety gates, authorization boundaries, and forward-only recovery.

### Modified Capabilities

None. The repository has no main specs; the existing `plugin-packaging` capability remains owned by the active `add-open-in-app-sidebar-plugin` change.

## Impact

- Repository configuration and documentation: `package.json`, `pnpm-lock.yaml`, `.github/workflows/`, `.husky/commit-msg`, `.gitignore`, and `README.md`.
- New release-only development dependencies for semantic-release and its commit analysis, release-notes, npm, and GitHub plugins; no runtime dependency or plugin behavior changes.
- Execution orchestration: automatic implementers stop after focused repository checks; `openspec-verifier` owns full-suite/build/package validation; the primary orchestrator owns the post-verification live runbook and authorization boundaries.
- External systems, only through that authorized runbook: npm public package `opencode-open-in-app`, npm Trusted Publisher settings, GitHub Actions, git remotes/tags, pull requests, and GitHub Releases.
- The existing `add-open-in-app-sidebar-plugin` artifacts are preserved by this update. Candidate review explicitly accepts its already-authorized task 11.10 bookkeeping change as prior work; this release change does not create or extend that edit.
- Product code and `.vscode/` contents remain out of scope. The only related repository change allowed is versioning the `.vscode/` exclusion in `.gitignore`, and `.vscode/` content remains forbidden from mutation or publication.
