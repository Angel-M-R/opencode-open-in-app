## ADDED Requirements

### Requirement: Package shape loadable by OpenCode

The repository SHALL publish an ESM-only package whose entry point is a built module exporting a default `TuiPluginModule` with an `id` and a `tui` function. The package SHALL declare `"type": "module"` and expose built `.js` and `.d.ts` artifacts from `dist/`.

#### Scenario: Default export shape

- **WHEN** the built entry module is imported
- **THEN** its default export SHALL have a string `id` and a `tui` function property

#### Scenario: Published files

- **WHEN** the package is packed
- **THEN** the `files` list SHALL include the build output and the README and SHALL exclude sources and tests

### Requirement: Build and type configuration

The build SHALL use `tsup` producing ESM output with declarations, `bundle: true`, `splitting: false`, and the Solid esbuild plugin configured with `generate: "universal"` and `moduleName: "@opentui/solid"`. `@opencode-ai/plugin`, `@opencode-ai/plugin/tui`, `@opentui/core`, `@opentui/solid`, and `solid-js` SHALL be externals. TypeScript SHALL use `module` and `moduleResolution` of `NodeNext`, `strict: true`, `jsx: "react-jsx"`, and `jsxImportSource: "@opentui/solid"`.

#### Scenario: Build succeeds

- **WHEN** the build script is run on a clean checkout with dependencies installed
- **THEN** it SHALL exit zero and emit the entry `.js` and `.d.ts` into `dist/`

#### Scenario: Host packages are not bundled

- **WHEN** the build output is inspected
- **THEN** the host and Solid packages SHALL remain external imports rather than inlined code

#### Scenario: Typecheck succeeds

- **WHEN** the typecheck script is run over sources and tests
- **THEN** it SHALL exit zero with no type errors

### Requirement: Dependency policy

The host and rendering packages SHALL be declared as peer dependencies (`@opencode-ai/plugin`, `@opentui/core`, `@opentui/solid`, `solid-js`) and installed as dev dependencies for local development and testing. The package SHALL declare no runtime dependencies.

#### Scenario: No runtime dependencies

- **WHEN** the manifest is inspected
- **THEN** the `dependencies` field SHALL be absent or empty

#### Scenario: Peers available for typecheck and tests

- **WHEN** development dependencies are installed
- **THEN** the peer packages SHALL be resolvable so that typecheck, tests, and build can run

### Requirement: Validation commands

The package SHALL expose scripts for building, typechecking, and running the vitest unit suite, and SHALL enforce conventional commit messages via commitlint wired through husky. Continuous integration and automated publishing are out of scope for this change.

#### Scenario: Test script runs the unit suite

- **WHEN** the test script is run
- **THEN** vitest SHALL execute the unit test directory and exit zero when all tests pass

#### Scenario: Commit message linting

- **WHEN** a commit message that violates conventional commits is submitted
- **THEN** the commit-msg hook SHALL reject it

#### Scenario: No CI or release automation

- **WHEN** the repository is inspected
- **THEN** it SHALL contain no CI workflow and no automated release configuration

### Requirement: Package identity decided before implementation

The published package name SHALL be recorded in the change's design before implementation, and SHALL reflect that the plugin supports multiple applications rather than only VS Code, even though the repository directory is named `opencode-open-in-vscode`.

#### Scenario: Name recorded and applied consistently

- **WHEN** the manifest is authored
- **THEN** its `name` SHALL match the name recorded in the design document
- **AND** the plugin `id` and the README SHALL use that same identity
