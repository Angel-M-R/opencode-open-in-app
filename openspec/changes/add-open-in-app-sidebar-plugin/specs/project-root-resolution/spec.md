## ADDED Requirements

### Requirement: Project root resolution order

The plugin SHALL resolve the directory handed to an external application by evaluating `api.state.path.directory`, then `api.state.path.worktree`, then `process.cwd()` in that order. A candidate SHALL be valid only when it is a non-blank string containing an absolute path which, after platform-appropriate normalization, identifies an existing directory. The first valid candidate SHALL be returned in normalized absolute form. Reading, normalizing, or checking any candidate, including `process.cwd()`, SHALL never let an exception propagate; an invalid or failing candidate SHALL be skipped. If no candidate is valid, resolution SHALL return no project root and SHALL NOT throw.

#### Scenario: Session directory available

- **WHEN** `api.state.path.directory` is an absolute path to an existing directory
- **THEN** the resolved project root SHALL be its normalized absolute path
- **AND** `api.state.path.worktree` and `process.cwd()` SHALL NOT be consulted

#### Scenario: Session directory invalid and worktree valid

- **WHEN** `api.state.path.directory` is absent, blank, relative, nonexistent, not a directory, or fails validation
- **AND** `api.state.path.worktree` is an absolute path to an existing directory
- **THEN** the resolved project root SHALL be the normalized worktree path

#### Scenario: Host paths invalid and cwd valid

- **WHEN** neither `api.state.path.directory` nor `api.state.path.worktree` is a valid candidate
- **AND** `process.cwd()` yields an absolute path to an existing directory
- **THEN** the resolved project root SHALL be the normalized cwd path

#### Scenario: Non-string path values are rejected

- **WHEN** a path candidate is a non-string value such as a number, `null`, or an object
- **THEN** that candidate SHALL be treated as absent and the next candidate in the chain SHALL be used

#### Scenario: Candidate validation throws

- **WHEN** reading, normalizing, or checking a candidate throws
- **THEN** the plugin SHALL treat that candidate as invalid and continue to the next candidate
- **AND** no exception SHALL propagate to the host

#### Scenario: No valid directory exists

- **WHEN** all three candidates are invalid or fail validation
- **THEN** resolution SHALL return no project root
- **AND** the plugin SHALL NOT attempt an application launch
- **AND** no exception SHALL propagate to the host

### Requirement: Only the project root is opened

The plugin SHALL pass exactly the resolved project root directory as one atomic argv value within the launched application's fixed argv template. It SHALL NOT open individual files and SHALL NOT infer an active, focused, or recently edited file.

#### Scenario: Launch argument is the directory

- **WHEN** an application is launched for a resolved project root
- **THEN** the root value passed in argv SHALL be the normalized absolute path of that existing directory
- **AND** any argv entries before the root SHALL be fixed application-owned entries

#### Scenario: File-level state is ignored

- **WHEN** the host session exposes file-level state such as open or edited files
- **THEN** the plugin SHALL ignore it when deciding what to open
