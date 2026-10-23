## ADDED Requirements

### Requirement: Ticket prefix comes from the brand configuration
The brand configuration SHALL define the ticket prefix that new boards start with, and a board
created without an explicit prefix SHALL use it. Renaming a board's prefix SHALL keep working as
before.

#### Scenario: New board
- **WHEN** a space opens its board for the first time
- **THEN** its tickets are referenced as `NUR-1`, `NUR-2` and so on

#### Scenario: Invalid prefix is rejected
- **WHEN** the configured ticket prefix is empty, starts with a digit, contains a symbol, or is longer than a board prefix may be
- **THEN** brand validation fails with a message naming `ticketPrefix`, and the build does not proceed

#### Scenario: Existing boards
- **WHEN** the migration runs on a board that still has the old `RAK` prefix
- **THEN** the board's prefix becomes `NUR` and its next ticket is numbered from the same counter

#### Scenario: Chosen prefix is kept
- **WHEN** a board's prefix is anything other than `RAK`
- **THEN** the migration leaves it unchanged
