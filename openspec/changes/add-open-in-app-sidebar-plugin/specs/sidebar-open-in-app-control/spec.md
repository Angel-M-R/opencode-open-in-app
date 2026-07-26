## ADDED Requirements

### Requirement: Control registered in the sidebar title slot

The plugin SHALL register a slot plugin through `api.slots.register` that contributes to the host slot `sidebar_title`, and SHALL register a disposal handler via `api.lifecycle.onDispose` that tears down the reactive root and all registered cleanups exactly once.

#### Scenario: Registration on activation

- **WHEN** the plugin's `tui` entry point is invoked with the host API
- **THEN** it SHALL register exactly one slot plugin providing a `sidebar_title` renderer
- **AND** it SHALL register a disposal handler with `api.lifecycle.onDispose`

#### Scenario: Disposal is idempotent

- **WHEN** disposal is triggered more than once, whether by the host or by component cleanup
- **THEN** cleanups SHALL run only once and no error SHALL be raised

#### Scenario: Only visible inside a session

- **WHEN** the user is not inside a session and the sidebar title slot is not rendered by the host
- **THEN** the control SHALL NOT be displayed

### Requirement: Control preserves the host sidebar title

The control SHALL occupy a single line of height and SHALL use a slot mode that does not suppress the host's own sidebar title content. The chosen mode SHALL be the one verified against the installed `SlotMode` definition, and the host-provided `title` prop SHALL remain visible to the user.

#### Scenario: Single-line layout

- **WHEN** the control renders
- **THEN** its total height SHALL be one line and its text SHALL be truncated rather than wrapped

#### Scenario: Host title still readable

- **WHEN** the control is rendered alongside the host sidebar title
- **THEN** the host title SHALL still be visible and SHALL NOT be replaced by the control

### Requirement: Two adjacent activation regions

The control SHALL render two adjacent focusable regions: a label region and a chevron region. Each region SHALL respond to a primary mouse button press and to the `enter` and `space` keys while focused, and SHALL take focus on mouse activation.

#### Scenario: Label activation opens with the favourite

- **WHEN** the label region is activated by primary click or by `enter` or `space`
- **THEN** the plugin SHALL launch the effective favourite application with the resolved project root
- **AND** the picker dialog SHALL NOT open

#### Scenario: Chevron activation opens the picker

- **WHEN** the chevron region is activated by primary click or by `enter` or `space`
- **THEN** the plugin SHALL open the application picker dialog
- **AND** no launch SHALL occur until a selection is made

#### Scenario: Non-primary mouse buttons ignored

- **WHEN** a region receives a mouse event whose button is not the primary button
- **THEN** the event SHALL be ignored and no launch or dialog SHALL occur

#### Scenario: Unrelated keys pass through

- **WHEN** a focused region receives a key other than `enter` or `space`
- **THEN** the plugin SHALL NOT consume the event and SHALL NOT prevent host handling

#### Scenario: Handled events do not bubble

- **WHEN** a region handles an activation event
- **THEN** the event SHALL have its default prevented and its propagation stopped so the host does not double-handle it

### Requirement: Application picker dialog

The picker SHALL be rendered with `api.ui.DialogSelect` and SHALL list only detected applications in canonical order. Selecting an option SHALL both persist that application as the favourite and launch it. Dismissing the dialog SHALL change nothing.

#### Scenario: Selection launches and persists

- **WHEN** the user selects an application from the picker
- **THEN** that application SHALL be launched with the resolved project root
- **AND** it SHALL become the persisted favourite

#### Scenario: Dialog dismissed

- **WHEN** the user dismisses the picker without selecting
- **THEN** no launch SHALL occur and the persisted favourite SHALL be unchanged

#### Scenario: No detected applications

- **WHEN** no applications were detected
- **THEN** activating either region SHALL NOT launch anything
- **AND** the plugin SHALL inform the user via `api.ui.toast` instead of opening an empty picker

### Requirement: Command and keybinding for the favourite action

The plugin SHALL attempt to expose the "open project root with the favourite application" action as a command with a keybinding through `api.keymap.registerLayer`, guarded so that a missing or untyped keymap implementation degrades gracefully.

#### Scenario: Keymap available

- **WHEN** `api.keymap.registerLayer` is a callable function
- **THEN** the plugin SHALL register the command and its binding
- **AND** SHALL unregister it during disposal

#### Scenario: Keymap unavailable

- **WHEN** `api.keymap` or `api.keymap.registerLayer` is absent or not callable
- **THEN** the plugin SHALL skip registration without throwing
- **AND** the mouse and keyboard activation of the control SHALL continue to work

#### Scenario: Command performs the same action as the label

- **WHEN** the registered command is dispatched
- **THEN** the effect SHALL be identical to activating the label region
