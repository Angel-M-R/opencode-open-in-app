# continuous-integration Specification

## Purpose

Define validation-only continuous integration requirements for supported runtime compatibility, reproducible installs, repository validation, and exact package-content inspection.

## Requirements

### Requirement: CI validates pull requests and pushes
The repository SHALL provide a GitHub Actions CI workflow that runs on pull requests and pushes and executes typecheck, the complete test suite, an explicit build, a package-validation gate that performs an npm-based JSON dry run and an executable exact-file allowlist assertion, and a production dependency audit at moderate severity.

#### Scenario: Pull request is updated
- **WHEN** a pull request is opened or receives a new commit
- **THEN** CI SHALL run all five validation gates and report any failing gate

#### Scenario: Branch receives a push
- **WHEN** a commit is pushed to any branch
- **THEN** the same validation gates SHALL run

### Requirement: CI cannot publish
The CI workflow SHALL be validation-only, SHALL request only read access to repository contents, SHALL NOT request an OIDC identity token, and SHALL NOT publish packages, create tags, or create GitHub Releases.

#### Scenario: CI succeeds on main
- **WHEN** the CI workflow completes successfully for a push to `main`
- **THEN** no npm version, git tag, or GitHub Release SHALL be created by CI

### Requirement: CI exercises the supported Node floor
CI SHALL run on Node.js 22.13, matching the minimum version declared by the package's consumer engine contract. The release workflow MAY use a newer runtime required by npm Trusted Publishing.

#### Scenario: Minimum-version compatibility
- **WHEN** CI validates the package
- **THEN** typecheck, tests, build, package inspection, and audit SHALL execute on Node.js 22.13

### Requirement: Workflow installation is reproducible and script-free
CI and release workflows SHALL provision pnpm from the manifest's `packageManager` field and install from the committed lockfile using `pnpm install --frozen-lockfile --ignore-scripts`.

#### Scenario: Lockfile does not match the manifest
- **WHEN** a workflow installs dependencies with an out-of-date lockfile
- **THEN** installation SHALL fail before validation or publication

#### Scenario: Hooks are not installed on runners
- **WHEN** dependencies are installed in GitHub Actions
- **THEN** lifecycle scripts, including Husky setup, SHALL not run

### Requirement: Package validation asserts the publishable artifact
The package dry-run script SHALL use the working npm command `npm pack --dry-run --json`. CI and release workflows SHALL invoke an executable assertion that parses that JSON and requires the package file paths to equal exactly `LICENSE`, `README.md`, `dist/tui.d.ts`, `dist/tui.js`, and `package.json`, excluding product sources, tests, OpenSpec artifacts, repository automation, and `.vscode/`. A listing without an executable comparison SHALL NOT satisfy this gate.

#### Scenario: Unexpected file enters the package
- **WHEN** the pack dry run lists a file outside the approved package contents
- **THEN** the executable assertion SHALL fail the CI or release job

#### Scenario: Expected build output is absent
- **WHEN** the package is built and inspected
- **THEN** validation SHALL require the JavaScript entry point, declaration entry point, README, and applicable license metadata to be present

#### Scenario: A workflow only prints the dry-run listing
- **WHEN** CI or release runs the npm pack dry run without executing the exact-file comparison
- **THEN** the package-validation gate SHALL be incomplete and SHALL NOT permit success or publication
