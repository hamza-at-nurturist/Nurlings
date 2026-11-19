## ADDED Requirements

### Requirement: The board is a per-account setting

The ticket board SHALL be available to an account that turns it on in Labs, and to every account
when the deployment sets `TICKET_BOARD_ENABLED=true`. Ticket tools, owner wakes, date reminders and
mention wakes for a Nurling SHALL act only when its owner has the board on.

#### Scenario: Deployment turns the board on

- **WHEN** the server runs with `TICKET_BOARD_ENABLED=true` and an account has not touched Labs
- **THEN** that account sees the board and its Nurlings are woken for assigned tickets

#### Scenario: Owner has the board off

- **WHEN** a ticket is assigned to a Nurling whose owner has the board off and the deployment has not turned it on
- **THEN** no wake, date reminder or mention wake is queued for that Nurling
