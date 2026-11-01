## MODIFIED Requirements

### Requirement: Board cards match the web card
A card SHALL show the ref, the Needs you badge when it applies, the title, then either
"{name} is working…" while a Nurling has an active run for the ticket or the latest comment at
most two lines, and a footer with the owner's avatar and name, the dates, and the file count when
there are files. A due that has passed on an open ticket SHALL show in the destructive colour.
A finished ticket SHALL be dimmed. The card SHALL have a small ⋯ button that opens the card's
menu, and no inline Approve.

#### Scenario: Working
- **WHEN** a Nurling has an active run for a ticket
- **THEN** the card shows "{name} is working…" in place of the latest comment

#### Scenario: Menu button
- **WHEN** a card is shown
- **THEN** it has a ⋯ button with a short accessible name that opens the card's menu

### Requirement: Card actions and opening a card
Tapping a card SHALL open the ticket. The card's ⋯ button SHALL open the platform's native
context menu with Move to (the six statuses, the current one checked), Approve (only while the
ticket is In review) and Open. A move SHALL show at once and SHALL revert with an error if the
server refuses it. Approve SHALL move the ticket to Done and record that the user approved it.

#### Scenario: Move from the menu
- **WHEN** the user opens a To do card's ⋯ menu and picks Move to, Blocked
- **THEN** the card is in Blocked

#### Scenario: Approve only in review
- **WHEN** the user opens the ⋯ menu of a card that is not In review
- **THEN** the menu has no Approve

#### Scenario: Approve
- **WHEN** the user opens an In review card's ⋯ menu and picks Approve
- **THEN** the ticket is Done and the activity shows that the user approved it

#### Scenario: Refused move
- **WHEN** the server refuses a move
- **THEN** the card returns to its column and an error shows

## ADDED Requirements

### Requirement: Lift and drag a card
Long-pressing a card SHALL lift it, with a small haptic where the platform provides one and a
slight scale and shadow. Dragging SHALL move a floating copy of the card under the finger.

#### Scenario: Lift
- **WHEN** the user long-presses a card
- **THEN** the card lifts and a copy follows the finger

#### Scenario: Tap still opens
- **WHEN** the user taps a card without holding
- **THEN** the ticket opens

### Requirement: Drop a card on a column
Releasing a lifted card over a valid target column SHALL move the ticket to that column's status
as the card menu's Move to does. A column is a valid target when its status differs from the
card's, the same rule the web board uses. Releasing anywhere else SHALL return the card.

#### Scenario: Drop on another column
- **WHEN** the user long-presses a To do card, drags it over In progress and releases
- **THEN** the ticket is In progress

#### Scenario: Drop elsewhere
- **WHEN** the user releases a lifted card between columns or over its own column
- **THEN** the card returns to its column and the ticket is unchanged

#### Scenario: Refused drop
- **WHEN** the server refuses a dropped card's move
- **THEN** the card returns to its column and an error shows

### Requirement: Dragging holds scrolling still
While a card is lifted the column pager and the column list SHALL NOT scroll from touch; only
edge auto-scroll moves them.

#### Scenario: Scrolling is held still
- **WHEN** a card is lifted and the finger moves
- **THEN** the pager and the column list do not scroll from that touch

### Requirement: Drop target highlight
While a card is dragged, the column under it SHALL be highlighted if it is a valid target and
SHALL NOT be highlighted otherwise.

#### Scenario: Valid column
- **WHEN** a dragged In progress card is over To do
- **THEN** To do is highlighted

#### Scenario: Own column
- **WHEN** a dragged card is over its own column
- **THEN** no column is highlighted

### Requirement: Edge auto-scroll while dragging
While a card is held near the left or right screen edge the column pager SHALL scroll toward the
neighbouring column and keep scrolling while the card stays there; near the top or bottom edge
the current column's list SHALL scroll vertically. Scrolling SHALL get faster the closer the card
is to the edge and SHALL stop when the card leaves the edge zone, is released, or the end of the
content is reached. The card SHALL drop into whichever column is under it on release.

#### Scenario: Reach a far column
- **WHEN** the user holds a lifted card at the right edge of the screen on To do
- **THEN** the pager scrolls to the next columns while held, and releasing drops the card into the column under it

#### Scenario: Speed ramps
- **WHEN** the card is nearer the edge than before
- **THEN** the scroll is faster than before

#### Scenario: Vertical
- **WHEN** a lifted card is held near the bottom edge of a long column
- **THEN** that column's list scrolls down while held
