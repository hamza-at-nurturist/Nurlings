## MODIFIED Requirements

### Requirement: Ticket notifications open the ticket
Tapping a push notification that carries a ticket id (a Nurling mentioned the user on a ticket, a
ticket is overdue) SHALL open the Ticket screen at `/nurlings/ticket` for that ticket in the
notification's space, and `rakazo://ticket` links SHALL do the same. A `rakazo://board` link SHALL
open the Board screen at `/nurlings/board`. A notification without a ticket id SHALL keep opening
the Nurling's chat.

#### Scenario: Overdue push
- **WHEN** the user taps "NUR-7 is overdue"
- **THEN** the Ticket screen for NUR-7 opens

#### Scenario: Other space
- **WHEN** the notification belongs to a space that is not selected
- **THEN** the app switches to that space and opens the ticket

#### Scenario: Chat notification
- **WHEN** the user taps a notification with no ticket id
- **THEN** the Nurling's chat opens as before

#### Scenario: Board link
- **WHEN** the user opens `rakazo://board`
- **THEN** the Nurlings Board screen opens

## ADDED Requirements

### Requirement: The fork's Board owns its own route
The Board and Ticket screens SHALL live at `/nurlings/board` and `/nurlings/ticket`, and every
entry (home header, Settings > Board, push notifications, deep links) SHALL open them. No entry
SHALL navigate to `/board`, which belongs to the upstream board screen kept unlinked in the tree.

#### Scenario: Settings entry
- **WHEN** the ticket board is enabled and the user picks Board in Settings
- **THEN** the Nurlings Board screen opens

#### Scenario: Upstream board unreachable
- **WHEN** any in-app link or notification is followed
- **THEN** none navigates to `/board`
