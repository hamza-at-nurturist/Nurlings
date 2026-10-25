## MODIFIED Requirements

### Requirement: The ticket modal can fill the window
On a wide window the modal header SHALL have an icon button next to close that toggles the modal
between its normal size and filling the window, named "Expand" or "Collapse". The choice SHALL be
remembered per browser, and the modal SHALL still open at its normal size when storage is
unavailable. On a narrow window the modal always fills the screen and SHALL NOT show the button.

#### Scenario: Expand
- **WHEN** the user presses Expand on a wide window
- **THEN** the modal fills the window and the button reads Collapse

#### Scenario: Remembered
- **WHEN** the user reopens a ticket after expanding
- **THEN** it opens expanded

#### Scenario: Storage unavailable
- **WHEN** reading or writing browser storage throws
- **THEN** the modal opens at its normal size and the button still works

#### Scenario: Narrow window
- **WHEN** the window is narrower than 1024px
- **THEN** the modal fills the screen and there is no Expand or close button

## ADDED Requirements

### Requirement: Narrow ticket sheet with two tabs
Below 1024px wide the ticket SHALL open as a full-screen sheet with a "Ticket" tab and an
"Activity" tab, opening on Ticket. Tapping a tab or swiping left or right on the content SHALL
switch tabs; a swipe that starts in a text field SHALL NOT. The header SHALL have a back button
that closes the sheet, followed by "Board / {ref}" on the Ticket tab or the ticket title on one
truncated line on the Activity tab. A reply draft and staged files SHALL survive switching tabs.

#### Scenario: Open on a phone
- **WHEN** the user opens a ticket on a 390px wide window
- **THEN** the sheet fills the screen on the Ticket tab with "Board / {ref}" in the header

#### Scenario: Switch tabs
- **WHEN** the user taps Activity or swipes left on the Ticket tab
- **THEN** the Activity tab shows and the header shows the ticket title

#### Scenario: Swipe in a field
- **WHEN** a horizontal swipe starts inside the title, description or reply field
- **THEN** the tab does not change

#### Scenario: Back
- **WHEN** the user presses back
- **THEN** the sheet closes

#### Scenario: Draft kept
- **WHEN** the user types a reply, switches to Ticket and back
- **THEN** the reply text and staged files are still there

### Requirement: Narrow Ticket tab is laid out for touch
The Ticket tab SHALL show the title, the properties as a wrapping row of chips (status, owner with
its avatar, due, start, priority) that open the same pickers as the wide modal, a one-line row with
the newest comment's author, text and time that opens the Activity tab, the description clamped to
three lines with "Show more" when it overflows, and the files. While the ticket is in review,
Approve SHALL be pinned at the bottom.

#### Scenario: Chips
- **WHEN** the user taps the status chip
- **THEN** the status menu opens and picking a status updates the ticket

#### Scenario: Latest activity
- **WHEN** the ticket has comments and the user taps the latest-activity row
- **THEN** the Activity tab opens

#### Scenario: No comments
- **WHEN** the ticket has no comments
- **THEN** no latest-activity row is shown

#### Scenario: Long description
- **WHEN** the description is longer than three lines
- **THEN** three lines show with "Show more", which reveals the rest

#### Scenario: Approve pinned
- **WHEN** the ticket is in review
- **THEN** Approve is pinned at the bottom of the Ticket tab, and it is absent in any other status

### Requirement: The narrow sheet fits touch screens
Every control on the narrow sheet SHALL be at least 44px tall, and the sheet SHALL pad its top and
bottom for the device's safe areas.

#### Scenario: Touch targets
- **WHEN** the sheet is open on a phone
- **THEN** back, tabs, chips, Approve, attach and send are each at least 44px tall

#### Scenario: Home indicator
- **WHEN** the device has a bottom safe area
- **THEN** the pinned Approve and reply box sit above it

### Requirement: Narrow Activity tab reads like chat
The Activity tab SHALL fill from the bottom, scroll to the newest item when opened and when items
arrive, and keep the time separators and working line. The reply box SHALL be pinned at the bottom,
stay above the on-screen keyboard, and use 16px text.

#### Scenario: Short feed
- **WHEN** the feed is shorter than the screen
- **THEN** its items sit directly above the reply box

#### Scenario: Reply
- **WHEN** the user sends a reply from the Activity tab
- **THEN** the comment appears at the bottom of the feed and the box clears

### Requirement: The Activity tab counts new items
On a narrow window the Activity tab SHALL show how many feed items not made by the user arrived
since the user last viewed the ticket's activity, shown as "9+" above nine, and nothing at zero.
Viewing the Activity tab, or having the wide modal open, SHALL mark the activity seen. A ticket
never opened in this browser SHALL start at zero. When browser storage is unavailable the count
SHALL last until the modal closes.

#### Scenario: New comment while reading
- **WHEN** a Nurling comments while the user is on the Ticket tab
- **THEN** the Activity tab shows 1

#### Scenario: Cleared
- **WHEN** the user opens the Activity tab
- **THEN** the count disappears and stays gone on reopening

#### Scenario: Own reply
- **WHEN** the user's own comment is the only new item
- **THEN** no count is shown

### Requirement: Ticket images show as thumbnails
On every width, image files on the ticket SHALL show as square thumbnails in a grid (three columns
on narrow) and other files as cards (full width on narrow). Tapping a thumbnail SHALL open the
image full screen with a close button.

#### Scenario: Images and files
- **WHEN** a ticket has a PNG and a PDF
- **THEN** the PNG shows as a thumbnail and the PDF as a card

#### Scenario: Viewer
- **WHEN** the user taps a thumbnail
- **THEN** the image opens full screen, and closing it returns to the ticket
