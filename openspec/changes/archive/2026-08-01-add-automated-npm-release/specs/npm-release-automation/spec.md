## ADDED Requirements

### Requirement: Package metadata supports public trusted publication
`package.json` SHALL identify the package as `opencode-open-in-app` and SHALL declare canonical repository metadata for `https://github.com/Angel-M-R/opencode-open-in-app`, a README homepage, the canonical issue tracker, relevant keywords, MIT licensing, and `publishConfig.access: public`. The package SHALL provide a package dry-run script using `npm pack --dry-run --json`, an executable exact-file package-content assertion, and scripts for production audit and semantic-release.

#### Scenario: Public package metadata is inspected
- **WHEN** the prepared manifest is reviewed before bootstrap publication
- **THEN** its npm name, repository, homepage, bugs URL, license, keywords, and public access configuration SHALL match the canonical package and repository

#### Scenario: Trusted Publisher validates repository identity
- **WHEN** npm compares the package repository metadata with the GitHub Actions identity
- **THEN** both SHALL identify `Angel-M-R/opencode-open-in-app`

### Requirement: Repository preparation is non-mutating outside the working tree
The initial preparation SHALL add metadata, scripts, release dependencies, CI, a complete dispatch-only release workflow, documentation, an executable Husky `commit-msg` hook, and a repository `.gitignore` entry excluding `.vscode/`, and SHALL set the temporary bootstrap version to `0.1.0`. The automatic planned-task loop SHALL contain only repository-local preparation that needs no maintainer interaction. Completing preparation tasks SHALL NOT authorize a push, pull request, merge, npm publish, tag, GitHub Release, workflow run or activation, npm website edit, secret inspection, or secret mutation.

#### Scenario: Local preparation completes
- **WHEN** all repository files and local validation are ready
- **THEN** rollout SHALL stop for explicit maintainer authorization before any repository or external mutation

#### Scenario: Excluded areas are inspected
- **WHEN** the preparation diff is reviewed
- **THEN** it MAY contain the already-authorized bookkeeping change to `openspec/changes/add-open-in-app-sidebar-plugin/tasks.md` task 11.10 and the `.gitignore` exclusion for `.vscode/`
- **AND** it SHALL contain no functional plugin changes and no mutation or tracked publication of content under `.vscode/`

### Requirement: Planning separates implementation, final verification, and live rollout
Planned-task implementers MUST limit validation to focused lint, typecheck, and the minimum relevant tests and MUST NOT run the full repository test suite, any build, package dry run, or complete release validation set. After all implementation tasks are complete, the primary orchestrator SHALL invoke `openspec-verifier` to run typecheck, the complete test suite, build, the npm-based package dry run and executable exact-file allowlist assertion, and production audit. The post-verification live rollout SHALL remain outside tracked implementation checkboxes and SHALL be controlled by the primary orchestrator.

#### Scenario: Automatic implementation section executes
- **WHEN** a planned implementation worker processes any task section
- **THEN** it SHALL perform only repository-local work and focused validation without asking for authorization or performing an external mutation

#### Scenario: Planned implementation completes
- **WHEN** every tracked implementation checkbox is complete
- **THEN** execution SHALL stop for the primary orchestrator to invoke the full `openspec-verifier` gate before any live rollout action

#### Scenario: Final verification fails or becomes stale
- **WHEN** a full verifier gate fails or the publish candidate differs from the verifier-bound checkout
- **THEN** live publication authority SHALL remain blocked until `openspec-verifier` passes on the exact candidate

### Requirement: Manual 0.1.0 bootstrap is explicitly authorized and verified
The first public version SHALL be `0.1.0` and SHALL be published manually from a clean checkout of canonical `main` only after explicit maintainer authorization. The exact publish candidate SHALL have current passing `openspec-verifier` evidence for typecheck, the complete test suite, build, the npm-based package dry run and executable exact-file allowlist assertion, and production audit; canonical `main` and the asserted package contents SHALL be confirmed unchanged from that evidence immediately before publication. The published version SHALL receive a matching `v0.1.0` tag and GitHub Release with generated notes, each created only after separate explicit authorization and only after npm publication succeeds.

#### Scenario: Manual bootstrap is authorized
- **WHEN** canonical `main` contains the reviewed temporary `0.1.0` manifest and all immediate pre-publish checks pass
- **AND** the maintainer explicitly authorizes manual publication
- **THEN** `opencode-open-in-app@0.1.0` SHALL be published with public access using interactive maintainer authentication

#### Scenario: A pre-publish check fails
- **WHEN** any immediate validation gate fails or package contents differ from the approved dry run
- **THEN** no npm publication, tag, or GitHub Release SHALL be created

#### Scenario: Bootstrap publication succeeds
- **WHEN** npm confirms `0.1.0` is public
- **AND** the maintainer separately authorizes release metadata creation
- **THEN** tag `v0.1.0` and its GitHub Release with generated notes SHALL be created without modifying the published version

### Requirement: Release workflow remains dormant before npm trust
The complete `.github/workflows/release.yml` SHALL initially use only `workflow_dispatch` and SHALL NOT be dispatched before `opencode-open-in-app@0.1.0` exists, the baseline tag exists, the workflow is present on canonical `main`, and the npm Trusted Publisher is confirmed configured.

#### Scenario: Dormant workflow reaches main
- **WHEN** the reviewed bootstrap automation is merged to canonical `main`
- **THEN** `release.yml` SHALL exist with no `push` trigger and the merge SHALL not start a release run

#### Scenario: Trust is not yet configured
- **WHEN** the dormant workflow exists but the maintainer has not confirmed the package's Trusted Publisher
- **THEN** nobody SHALL run or manually dispatch the release workflow

### Requirement: Committed version becomes a semantic-release sentinel
After the successful manual bootstrap and baseline tag, the committed manifest SHALL return to `0.0.0-development` through non-releasing setup work. Automated releases SHALL not commit their published version to `main`; npm and git tags SHALL be the released-version sources of truth.

#### Scenario: Bootstrap baseline is complete
- **WHEN** public `0.1.0`, tag `v0.1.0`, and its GitHub Release have been verified
- **THEN** a non-releasing repository update SHALL restore `package.json` to `0.0.0-development` before OIDC preflight

#### Scenario: Automated release completes
- **WHEN** semantic-release publishes version `X.Y.Z`
- **THEN** `package.json` on canonical `main` SHALL remain `0.0.0-development`

### Requirement: npm authentication uses Trusted Publishing OIDC only
Automated publication SHALL use npm Trusted Publishing for package `opencode-open-in-app`, owner `Angel-M-R`, repository `opencode-open-in-app`, and workflow filename `release.yml`. The release job SHALL run on a GitHub-hosted runner with `id-token: write`, a Node.js and npm version compatible with Trusted Publishing, and no `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or equivalent npm credential.

#### Scenario: Maintainer bootstraps trust
- **WHEN** the package and baseline release exist and dormant `release.yml` is present on canonical `main`
- **THEN** the maintainer SHALL configure the package-scoped Trusted Publisher with the exact repository and workflow identity
- **AND** SHALL confirm that no npm authentication token secret exists before preflight

#### Scenario: Automated publication authenticates
- **WHEN** semantic-release reaches npm verification or publication in GitHub Actions
- **THEN** npm authentication SHALL use the workflow's OIDC identity and the workflow SHALL reference no npm token

#### Scenario: Provenance is recorded
- **WHEN** the public package is published through Trusted Publishing
- **THEN** npm SHALL display provenance for that version

### Requirement: A no-release OIDC preflight gates activation
After Trusted Publisher confirmation and before `push` activation, the dormant workflow SHALL be manually dispatched only with explicit authorization. The run SHALL pass typecheck, tests, build, the npm-based package dry run and executable exact-file allowlist assertion, production audit, OIDC exchange, and semantic-release `verifyConditions`; it SHALL report no relevant release and create no npm version, tag, or GitHub Release.

#### Scenario: Dormant preflight succeeds
- **WHEN** only non-releasing setup commits exist after `v0.1.0` and the authorized dormant workflow runs
- **THEN** all verification and OIDC conditions SHALL pass
- **AND** semantic-release SHALL report no relevant release without creating release outputs

#### Scenario: Dormant preflight is unexpected or fails
- **WHEN** any check or OIDC condition fails, semantic-release proposes a release, or any release output is created
- **THEN** rollout SHALL stop before activation and operators SHALL investigate without deleting or rewriting versions, tags, or GitHub Releases

### Requirement: Activated releases run from main and serialize publication
Only after a successful preflight SHALL `release.yml` replace the dormant trigger with `push` on `main`. The release workflow SHALL serialize runs with cancellation disabled, use full git history, and treat tags and GitHub Releases exclusively as outputs.

#### Scenario: Activation pull request is ready
- **WHEN** the preflight evidence is green, the activation/documentation correction passes CI, and the maintainer authorizes its merge
- **THEN** merging its release-worthy `fix:` commit SHALL activate push-to-main publishing and start the first automated patch release

#### Scenario: Two pushes arrive close together
- **WHEN** one release run is active and another push reaches `main`
- **THEN** the second run SHALL wait without cancelling the first

#### Scenario: Workflow creates a tag
- **WHEN** semantic-release creates `vX.Y.Z` and its GitHub Release
- **THEN** those outputs SHALL not trigger another release workflow run

### Requirement: Semantic-release produces npm and GitHub release outputs
The manifest SHALL configure semantic-release for `main` with commit analyzer, release-notes generator, npm, and GitHub plugins. Conventional Commits SHALL determine the next version, and every automated npm publication SHALL create a matching `vX.Y.Z` tag and GitHub Release with generated notes using the built-in `GITHUB_TOKEN`.

#### Scenario: Fix commit reaches main after activation
- **WHEN** the commits since the previous release contain a `fix:` commit and no larger release signal
- **THEN** semantic-release SHALL publish the next patch version and matching tag and GitHub Release

#### Scenario: Feature commit reaches main after activation
- **WHEN** the commits since the previous release contain a `feat:` commit and no breaking change
- **THEN** semantic-release SHALL publish the next minor version and matching tag and GitHub Release

#### Scenario: No release-worthy commit reaches main
- **WHEN** an activated run sees only non-releasing commits since the previous tag
- **THEN** it SHALL complete without publishing or creating a tag or GitHub Release

### Requirement: Every release revalidates its exact checkout
Both the manual bootstrap and every automated release SHALL run typecheck, tests, explicit build, `npm pack --dry-run --json` with an executable assertion that the package paths equal exactly `LICENSE`, `README.md`, `dist/tui.d.ts`, `dist/tui.js`, and `package.json`, and production dependency audit immediately before publication. A failed gate SHALL prevent publication, and a dry-run listing without the assertion SHALL not count as a passing package gate.

#### Scenario: Package allowlist assertion is absent
- **WHEN** either CI or the release workflow performs only a package dry-run listing
- **THEN** release verification SHALL fail and semantic-release SHALL not run

#### Scenario: Automated validation fails
- **WHEN** any release-workflow validation gate fails
- **THEN** semantic-release SHALL not publish, tag, or create a GitHub Release for that run

#### Scenario: Manual validation becomes stale
- **WHEN** the checkout changes after a successful manual validation
- **THEN** all immediate pre-publish checks SHALL be rerun before manual publication can be authorized

### Requirement: External mutations require execution-time authorization
Publishing, tagging, creating GitHub Releases, pushing or merging repository changes, dispatching or activating workflows, editing npm Trusted Publisher settings, inspecting secrets, and deleting secrets SHALL each require explicit execution-time maintainer authorization obtained by the primary orchestrator. OpenSpec artifacts and task completion SHALL document prerequisites but SHALL NOT grant that authority, and these actions SHALL NOT appear as automatic planned implementation tasks.

#### Scenario: An external step becomes next
- **WHEN** all repository-side prerequisites for an external mutation are complete
- **THEN** the automatic implementation flow SHALL remain stopped and the primary orchestrator SHALL request explicit authorization for that specific runbook mutation

#### Scenario: Authorization is withheld
- **WHEN** the maintainer does not authorize the pending external mutation
- **THEN** no equivalent or downstream external mutation SHALL occur

### Requirement: Defective releases recover forward
Operators SHALL NOT rewrite a published npm version or use `npm unpublish` as the normal recovery path. A defective version SHALL be deprecated when appropriate and corrected by publishing a later fixed version after the normal verification and authorization gates.

#### Scenario: Published version is defective
- **WHEN** a defect is discovered after publication
- **THEN** maintainers SHALL assess deprecation and prepare a verified fix release without replacing the existing version

#### Scenario: Publication succeeds but later release output fails
- **WHEN** npm contains a version but its tag or GitHub Release is missing
- **THEN** operators SHALL inspect existing state, stop automatic retries, and restore only the missing output after explicit authorization without republishing or rewriting the version

### Requirement: Release operation is documented
The README SHALL document public npm installation, Conventional Commit release effects, the staged OIDC rollout, release verification commands, the `0.0.0-development` sentinel, the implementation/verifier/live-rollout ownership boundaries, execution-time authorization boundaries, and forward-only recovery.

#### Scenario: Maintainer reads release documentation
- **WHEN** a maintainer prepares or diagnoses a release
- **THEN** the documentation SHALL identify the current gate, required evidence, prohibited premature actions, and the next authorization checkpoint
