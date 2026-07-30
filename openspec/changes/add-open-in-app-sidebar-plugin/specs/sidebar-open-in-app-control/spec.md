## ADDED Requirements

### Requirement: Control registered before reference sidebar content

The plugin SHALL register exactly one slot plugin through `api.slots.register` that contributes to `sidebar_content` at order `89`. It SHALL NOT register or replace `sidebar_title`, so the native sidebar title remains untouched. The plugin SHALL register a disposal handler through `api.lifecycle.onDispose` that tears down the reactive root and all registered cleanups exactly once.

#### Scenario: Registration on activation

- **WHEN** the plugin's `tui` entry point is invoked with the host API
- **THEN** it SHALL register exactly one `sidebar_content` renderer at order `89`
- **AND** it SHALL register a disposal handler with `api.lifecycle.onDispose`

#### Scenario: Control precedes the reference contribution

- **WHEN** this plugin and the reference sub-agent-statusline plugin at order `90` both contribute to `sidebar_content`
- **THEN** this plugin's order-89 control SHALL render immediately before the reference contribution's Subagents/Subagentes heading because lower orders render first

#### Scenario: Native title is untouched

- **WHEN** the control is registered and rendered
- **THEN** the plugin SHALL NOT contribute to `sidebar_title`
- **AND** it SHALL NOT render, replace, or duplicate the native sidebar title

#### Scenario: Disposal is idempotent

- **WHEN** disposal is triggered more than once, whether by the host or by component cleanup
- **THEN** cleanups SHALL run only once and no error SHALL be raised

#### Scenario: Only visible inside a session

- **WHEN** the user is not inside a session and sidebar content is not rendered by the host
- **THEN** the control SHALL NOT be displayed

### Requirement: Natural-width single-row copy

The control SHALL use natural width in a single row and SHALL NOT use flex-grow or a fixed-width layout that pushes the arrow to the far-right edge. With no effective favourite, the complete adjacent copy SHALL render exactly `Open in ↓`. With an effective favourite, it SHALL render exactly `Open in VS Code ↓`, `Open in Cursor ↓`, or `Open in File Explorer ↓` as appropriate.

#### Scenario: No favourite copy

- **WHEN** no persisted and currently detected favourite exists
- **THEN** the control SHALL render exactly `Open in ↓`

#### Scenario: Favourite copy

- **WHEN** a persisted favourite is currently detected
- **THEN** the control SHALL include that app's display name between `Open in` and `↓`
- **AND** the result SHALL exactly match one of `Open in VS Code ↓`, `Open in Cursor ↓`, or `Open in File Explorer ↓`

#### Scenario: Arrow remains adjacent

- **WHEN** the control renders in a sidebar wider than its content
- **THEN** the exact glyph `↓` SHALL remain directly adjacent to the text
- **AND** it SHALL NOT be aligned to the far-right edge

### Requirement: Separate text and arrow activation

The text and exact `↓` glyph SHALL be separate adjacent focusable regions. Each region SHALL respond to a primary mouse button press and to the `enter` and `space` keys while focused, and SHALL take focus on mouse activation.

#### Scenario: Text activation with a favourite

- **WHEN** the text region is activated and a displayed favourite exists
- **THEN** the plugin SHALL launch that favourite application with the resolved project root
- **AND** the picker dialog SHALL NOT open

#### Scenario: Text activation without a favourite

- **WHEN** the text region is activated and no displayed favourite exists
- **THEN** the plugin SHALL open the application picker
- **AND** it SHALL NOT auto-select or auto-launch the first detected application

#### Scenario: Arrow activation always opens the picker

- **WHEN** the `↓` region is activated, whether or not a displayed favourite exists
- **THEN** the plugin SHALL open the application picker
- **AND** no launch SHALL occur until the user selects an application

#### Scenario: Non-primary mouse buttons ignored

- **WHEN** a region receives a mouse event whose button is not the primary button
- **THEN** the event SHALL be ignored and no launch or dialog SHALL occur

#### Scenario: Unrelated keys pass through

- **WHEN** a focused region receives a key other than `enter` or `space`
- **THEN** the plugin SHALL NOT consume the event and SHALL NOT prevent host handling

#### Scenario: Handled events do not bubble

- **WHEN** a region handles an activation event
- **THEN** the event SHALL have its default prevented and its propagation stopped so the host does not double-handle it

### Requirement: Application picker dialog updates reactive display state

The picker SHALL be rendered with `api.ui.DialogSelect` and SHALL list only detected applications in canonical order. Selecting an option SHALL persist and launch that application, then notify `onFavouriteChanged(app)` after persistence so the displayed favourite changes reactively. Dismissing the dialog SHALL change nothing.

#### Scenario: Selection launches, persists, and updates the control

- **WHEN** the user selects an application from the picker
- **THEN** that application SHALL be persisted and launched with the resolved project root
- **AND** `onFavouriteChanged(app)` SHALL be invoked after persistence
- **AND** the control SHALL reactively display the selected application's name

#### Scenario: Dialog dismissed

- **WHEN** the user dismisses the picker without selecting
- **THEN** no launch SHALL occur and the persisted and displayed favourite SHALL be unchanged

#### Scenario: No detected applications

- **WHEN** detection finds no applications
- **THEN** attempting to open the picker SHALL NOT launch anything or show an empty picker
- **AND** the plugin SHALL inform the user through `api.ui.toast`

### Requirement: Command and keybinding follow text activation

The plugin SHALL attempt to expose the text region's action as a command with a keybinding through `api.keymap.registerLayer`, guarded so a missing or untyped keymap implementation degrades gracefully.

#### Scenario: Keymap available

- **WHEN** `api.keymap.registerLayer` is a callable function
- **THEN** the plugin SHALL register the command and its binding
- **AND** SHALL unregister it during disposal

#### Scenario: Keymap unavailable

- **WHEN** `api.keymap` or `api.keymap.registerLayer` is absent or not callable
- **THEN** the plugin SHALL skip registration without throwing
- **AND** mouse and keyboard activation of the control SHALL continue to work

#### Scenario: Command with a favourite

- **WHEN** the registered command is dispatched and a displayed favourite exists
- **THEN** the effect SHALL be identical to activating the text region and SHALL launch that favourite

#### Scenario: Command without a favourite

- **WHEN** the registered command is dispatched and no displayed favourite exists
- **THEN** the effect SHALL be identical to activating the text region and SHALL open the picker without auto-launching an application
