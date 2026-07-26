## ADDED Requirements

### Requirement: Project root resolution order

The plugin SHALL resolve the directory handed to an external application from the TUI plugin API using the ordered chain `api.state.path.directory`, then `api.state.path.worktree`, then `process.cwd()`. The first candidate that is a non-empty string after trimming SHALL be used.

#### Scenario: Session directory available

- **WHEN** `api.state.path.directory` is a non-empty string
- **THEN** the resolved project root SHALL be that value
- **AND** `api.state.path.worktree` and `process.cwd()` SHALL NOT be consulted

#### Scenario: Session directory missing or blank

- **WHEN** `api.state.path.directory` is `undefined`, empty, or whitespace only
- **AND** `api.state.path.worktree` is a non-empty string
- **THEN** the resolved project root SHALL be the worktree value

#### Scenario: No path information from the host

- **WHEN** neither `api.state.path.directory` nor `api.state.path.worktree` yields a non-empty string
- **THEN** the resolved project root SHALL be `process.cwd()`

#### Scenario: Non-string path values are rejected

- **WHEN** a path candidate is a non-string value such as a number, `null`, or an object
- **THEN** that candidate SHALL be treated as absent and the next candidate in the chain SHALL be used

### Requirement: Only the project root is opened

The plugin SHALL pass exactly the resolved project root directory to the launched application. It SHALL NOT open individual files and SHALL NOT infer an active, focused, or recently edited file.

#### Scenario: Launch argument is the directory

- **WHEN** an application is launched for a resolved project root
- **THEN** the single positional argument passed to the executable SHALL be that directory path

#### Scenario: File-level state is ignored

- **WHEN** the host session exposes file-level state such as open or edited files
- **THEN** the plugin SHALL ignore it when deciding what to open
