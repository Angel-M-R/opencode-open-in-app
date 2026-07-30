## ADDED Requirements

### Requirement: Fixed MVP application set

The plugin SHALL support exactly three applications in a fixed canonical order: VS Code, Cursor, and the operating system file explorer. The set SHALL NOT be user-configurable in this change.

#### Scenario: Canonical order is stable

- **WHEN** the application set is enumerated
- **THEN** the order SHALL be VS Code, then Cursor, then the file explorer, independent of detection results or stored preferences

#### Scenario: Only detected applications are offered

- **WHEN** an application in the set is not detected on the current machine
- **THEN** it SHALL NOT appear in the picker dialog and SHALL NOT be selectable as the favourite

### Requirement: Platform-specific fixed launch templates

The plugin SHALL own a shell-free, fixed command and argv template for every supported application. Each template SHALL insert the validated project root exactly once as one atomic argv value and SHALL NOT derive options or additional argv entries from project data. VS Code SHALL use `code` and Cursor SHALL use `cursor`; each editor's fixed template SHALL be `["--", projectRoot]` when that CLI's option-terminator support is confirmed and SHALL otherwise be `[projectRoot]`. The file explorer SHALL use the platform-specific templates defined below.

#### Scenario: Editor launch template

- **WHEN** VS Code or Cursor is launched
- **THEN** the command SHALL be the fixed command for that editor
- **AND** argv SHALL be either `[projectRoot]` or `["--", projectRoot]`, according to that editor's fixed template and option-terminator support
- **AND** the project root SHALL remain one atomic argv value

#### Scenario: macOS file explorer

- **WHEN** the platform is `darwin` and the file explorer is launched
- **THEN** the command SHALL be `open`
- **AND** argv SHALL be `["-a", "Finder", "--", projectRoot]`
- **AND** Finder SHALL be invoked explicitly rather than relying on generic content dispatch

#### Scenario: Linux file explorer

- **WHEN** the platform is `linux` and the file explorer is launched
- **THEN** the command SHALL be `xdg-open` with argv `[projectRoot]`
- **AND** the requirement SHALL be understood as dispatch through the platform's configured handler without claiming that a particular file manager is forced

#### Scenario: Windows file explorer

- **WHEN** the platform is `win32` and the file explorer is launched
- **THEN** the command SHALL be `explorer` with the safe fixed argv template `[projectRoot]`
- **AND** the project root SHALL NOT be concatenated with switches, commas, or other command text

#### Scenario: Unsupported platform

- **WHEN** the platform is none of `darwin`, `linux`, or `win32`
- **THEN** the file explorer SHALL be treated as not detected
- **AND** the plugin SHALL still offer any detected editors

### Requirement: Detection cached per activation

The plugin SHALL probe for each application's availability at most once per plugin activation and reuse the cached result for the lifetime of that activation. Each probe SHALL be bounded by a short timeout.

#### Scenario: Repeated interactions reuse the cache

- **WHEN** the user activates the control several times within one activation
- **THEN** detection SHALL have been performed only once per application

#### Scenario: Probe exceeds its timeout

- **WHEN** a detection probe does not complete within the configured timeout
- **THEN** the probe SHALL be abandoned and the application SHALL be treated as not detected
- **AND** no exception SHALL propagate to the host

#### Scenario: Fresh activation re-probes

- **WHEN** the plugin is disposed and activated again
- **THEN** detection SHALL run again rather than reusing the previous activation's cache

### Requirement: Shell-free launching through an injectable executor

All external process invocation SHALL go through an injectable `ProcessExecutor` abstraction whose default implementation calls `execFile(command, args, { timeout, windowsHide: true })` with the command and argv supplied by an application-owned fixed launch template. The plugin SHALL NOT spawn a shell, SHALL NOT interpolate the project root into a command string, and SHALL NOT permit project data to create executable options or additional argv entries.

#### Scenario: Directory with spaces or shell metacharacters

- **WHEN** the project root contains spaces, quotes, or characters such as `;`, `&`, or `$`
- **THEN** the path SHALL be passed as one atomic argv value within the selected application's fixed template
- **AND** no shell interpretation SHALL occur

#### Scenario: Tests substitute the executor

- **WHEN** a test provides a fake `ProcessExecutor`
- **THEN** the plugin SHALL invoke that fake instead of spawning any real process

### Requirement: Failures never throw and are reported to the user

Neither detection nor launching SHALL propagate an exception to the host. Every launch failure — spawn error, non-zero exit, or timeout — SHALL be reported to the user through `api.ui.toast`.

#### Scenario: Executable missing at launch time

- **WHEN** a launch fails because the command cannot be spawned
- **THEN** the plugin SHALL NOT throw
- **AND** a toast SHALL describe the failed application

#### Scenario: Launch exits non-zero

- **WHEN** the launched process exits with a non-zero status
- **THEN** the plugin SHALL NOT throw
- **AND** a toast SHALL describe the failure

#### Scenario: Launch times out

- **WHEN** the launch exceeds the configured timeout
- **THEN** the plugin SHALL NOT throw
- **AND** a toast SHALL describe the timeout

#### Scenario: Executor itself rejects

- **WHEN** the injected executor returns a rejected promise or throws synchronously
- **THEN** the plugin SHALL catch it and report it as a launch failure toast

#### Scenario: Successful launch is silent

- **WHEN** a launch succeeds
- **THEN** no error toast SHALL be shown
