## ADDED Requirements

### Requirement: Favourite app persisted globally

The plugin SHALL persist the identifier of the favourite application in `api.kv` under a single versioned, namespaced key that does not include any project, worktree, or session identity. One favourite SHALL therefore apply to every project.

#### Scenario: Favourite is read on activation

- **WHEN** the plugin activates and the store holds a favourite app identifier
- **AND** that application is currently detected
- **THEN** that identifier SHALL become the displayed favourite and SHALL be used for text activation

#### Scenario: Favourite is shared across projects

- **WHEN** the favourite is set while working in one project
- **AND** the plugin later activates in a different project directory
- **THEN** the same favourite SHALL be read back, because the key does not vary by project

#### Scenario: Selecting from the picker updates the favourite

- **WHEN** the user selects an application in the picker dialog
- **THEN** the plugin SHALL write that application's identifier to `api.kv` before or alongside launching it
- **AND** the displayed favourite SHALL update reactively after persistence
- **AND** subsequent text activations SHALL use the newly stored favourite

### Requirement: Only a persisted and detected app is an effective favourite

The plugin SHALL tolerate a missing, malformed, unrecognised, or currently undetected stored favourite without throwing. In every such case there SHALL be no effective favourite. The plugin SHALL NOT treat the first detected application as an implicit favourite.

#### Scenario: Nothing stored yet

- **WHEN** no favourite has ever been written
- **THEN** there SHALL be no effective favourite
- **AND** no detected application SHALL be auto-selected or auto-launched

#### Scenario: Stored value is malformed

- **WHEN** the stored value is not a string, or is an empty string, or is an object
- **THEN** the plugin SHALL NOT throw
- **AND** there SHALL be no effective favourite

#### Scenario: Stored favourite is no longer detected

- **WHEN** the stored favourite identifier is valid but that application is not detected on this machine
- **THEN** there SHALL be no effective favourite
- **AND** the stored value SHALL NOT be silently reused for a launch

#### Scenario: No applications detected at all

- **WHEN** detection finds no applications
- **THEN** there SHALL be no effective favourite
- **AND** the plugin SHALL NOT attempt any launch
