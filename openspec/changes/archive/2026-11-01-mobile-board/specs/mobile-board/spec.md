## ADDED Requirements

### Requirement: Board entry follows the ticket board flag
The mobile home screen SHALL show a Board button in its header only while the signed-in user's
`ticketBoardEnabled` is true. With the flag off the button SHALL NOT be shown, and the Board and
Ticket screens, reached by a link or a notification, SHALL close without showing any ticket.

#### Scenario: Flag on
- **WHEN** the server has the ticket board enabled and the user is on the home screen
- **THEN** the header shows a Board button that opens the Board screen

#### Scenario: Flag off
- **WHEN** the server has the ticket board disabled
- **THEN** the home header has no Board button

#### Scenario: Link with the flag off
- **WHEN** a notification or link opens the Ticket screen while the flag is off
- **THEN** the app returns to the home screen and shows no ticket

### Requirement: Board columns are paged
The Board screen SHALL show the six columns, To do, In progress, In review, Blocked, Done and
Won't do, as horizontally paged lists, one column per page about 84% of the screen width so the
next column shows at the edge, snapping from page to page. The board SHALL open on the first
column that has cards.

#### Scenario: Peek
- **WHEN** the board is shown on a 390pt wide screen
- **THEN** one column fills most of the width and the next shows at the edge

#### Scenario: Opens on content
- **WHEN** To do is empty and In progress has cards
- **THEN** the board opens on In progress

### Requirement: Column headers and older Done tickets
Each page SHALL start with a header of the column's status dot, name and count. While In review
has cards its page SHALL be tinted and its header SHALL show "Your turn". Done SHALL show tickets
completed in the last 7 days and, when there are older ones, a "Show N older" row that reveals
them.

#### Scenario: Your turn
- **WHEN** a ticket is In review
- **THEN** the In review page is tinted and its header shows "Your turn"

#### Scenario: Counts
- **WHEN** Done holds two tickets completed this week and six completed earlier
- **THEN** its header counts 8, the list shows two, and "Show 6 older" reveals the rest

### Requirement: Filter the board by Nurling
The Board screen SHALL offer All and one avatar per Nurling in a sideways-scrolling row; choosing
a Nurling shows only the tickets it owns with matching counts, and All shows every ticket,
including unowned ones.

#### Scenario: Filter
- **WHEN** the user picks Scout in the filter row
- **THEN** only Scout's tickets are shown and the column counts match them

### Requirement: Quick-add from the Board screen
A quick-add input pinned above the keyboard, "Tell a Nurling what to do…", SHALL create a ticket
from its text: the first line is the title, the rest the description. Typing `@` SHALL list the
Nurlings; the picked Nurling owns the ticket. With no Nurling picked the ticket SHALL be created
without an owner so Chief triages it. A failed create SHALL keep the typed text.

#### Scenario: Pick a Nurling
- **WHEN** the user types "@Sc" and picks Scout, then sends "@Scout skip trace the list"
- **THEN** a ticket titled "skip trace the list" is created and owned by Scout

#### Scenario: Chief triages
- **WHEN** the user sends "Call back the seller on 88 Maple" without an @
- **THEN** the ticket is created without an owner

#### Scenario: Failure keeps text
- **WHEN** creating the ticket is refused
- **THEN** an error shows and the text stays in the input

### Requirement: Board cards match the web card
A card SHALL show the ref, the Needs you badge when it applies, the title, then either
"{name} is working…" while a Nurling has an active run for the ticket or the latest comment at
most two lines, and a footer with the owner's avatar and name, the dates, and the file count when
there are files. A due that has passed on an open ticket SHALL show in the destructive colour.
A finished ticket SHALL be dimmed. The card SHALL have no drag handle and no inline Approve.

#### Scenario: Working
- **WHEN** the owner's run for the ticket is running
- **THEN** the card shows "{owner} is working…" and the owner's avatar shows working

#### Scenario: Overdue
- **WHEN** a To do ticket's due has passed
- **THEN** its due shows in the destructive colour

#### Scenario: Not overdue once done
- **WHEN** a Done ticket's due has passed
- **THEN** its due is not shown as overdue

### Requirement: Long-press a card for its actions
Long-pressing a card SHALL open the platform's native context menu with Move to (the six
statuses, the current one checked), Approve (only while the ticket is In review) and Open.
Tapping the card SHALL open the ticket. A move SHALL show at once and SHALL revert with an error
if the server refuses it. Approve SHALL move the ticket to Done and record that the user approved
it.

#### Scenario: Move
- **WHEN** the user long-presses a To do card and picks Move to, Blocked
- **THEN** the card is in Blocked

#### Scenario: Approve only in review
- **WHEN** the user long-presses a card that is not In review
- **THEN** the menu has no Approve

#### Scenario: Approve
- **WHEN** the user long-presses an In review card and picks Approve
- **THEN** the ticket is Done and the activity shows that the user approved it

#### Scenario: Refused move
- **WHEN** the server refuses a move
- **THEN** the card returns to its column and an error shows

### Requirement: The Board stays current
While the Board or a ticket is on screen and the app is in the foreground, changes SHALL appear
without a manual refresh, from the same board events the web board uses, reconnecting after a
dropped connection. While a Nurling has an active run for the open ticket its activity SHALL
refetch every few seconds. Pull to refresh SHALL reload the board. Returning to the app from the
background SHALL reload it.

#### Scenario: Another client moves a ticket
- **WHEN** a ticket is moved from the web while the Board is open on the phone
- **THEN** the card moves on the phone without the user doing anything

#### Scenario: Nurling comments
- **WHEN** a Nurling comments on the open ticket
- **THEN** the comment appears at the bottom of the Activity segment

### Requirement: Ticket screen with Ticket and Activity segments
The Ticket screen SHALL show a native segmented control, Ticket and Activity, opening on Ticket.
Switching SHALL keep a reply draft and staged files. The header SHALL show the ticket's ref and
a back action.

#### Scenario: Switch keeps the draft
- **WHEN** the user types a reply, switches to Ticket and back to Activity
- **THEN** the draft is still there

### Requirement: Ticket segment
The Ticket segment SHALL show the title; chips for status, owner, priority, start and due; a
latest-activity row (the newest comment's author, text and time) that opens the Activity segment;
the description clamped to three lines with "Show more" only when it overflows; image files as a
thumbnail grid that open in the app's image viewer; other files as cards that open like chat
files; and Approve pinned at the bottom while the ticket is In review.

#### Scenario: Clamped description
- **WHEN** the description is longer than three lines
- **THEN** it shows three lines and "Show more"

#### Scenario: Image
- **WHEN** the user taps an image thumbnail
- **THEN** the image opens in the viewer and closing returns to the ticket

#### Scenario: Approve
- **WHEN** the user taps Approve on an In review ticket
- **THEN** the ticket is Done and Approve is gone

### Requirement: Edit the ticket in place
The status, owner, priority, start and due chips SHALL open native menus and date pickers and
update the ticket when a value is picked. Editing the title or description SHALL save when the
field loses focus. A start after the due SHALL be refused with the server's message and leave the
ticket unchanged.

#### Scenario: Change status
- **WHEN** the user picks Blocked from the status chip
- **THEN** the ticket is Blocked and the chip shows it

#### Scenario: Start after due
- **WHEN** the user picks a start later than the due
- **THEN** an error shows and the ticket keeps its dates

### Requirement: Activity segment shows the feed
The Activity segment SHALL show the same merged feed as web, status and owner changes, files,
comments and failed runs in time order, newest at the bottom, with a centered time separator
using chat's rule and format, and "{name} is working…" while a Nurling has an active run. A
mention SHALL render in the feed as a chip tinted with the Nurling's own colour, neutral for a
user or when the colour is not a hex value.

#### Scenario: Separator
- **WHEN** two consecutive items are on different days or at least 15 minutes apart
- **THEN** a separator such as "Today 11:20 AM" sits between them

#### Scenario: Chip colour
- **WHEN** a comment mentions a Nurling whose colour is `#7C3AED::shape_8`
- **THEN** its chip is tinted with `#7C3AED`

### Requirement: Reply from the Activity segment
A reply composer pinned above the keyboard SHALL have attach (photo library, camera, file), an `@`
picker of the space's Nurlings, and send. Sending SHALL record the mentions and attached files
with the comment, and a failed send SHALL keep the draft and attachments.

#### Scenario: Reply with a mention
- **WHEN** the user sends "@Scout can you check this?" after picking Scout
- **THEN** the comment appears with a Scout-coloured chip and Scout is mentioned on the ticket

#### Scenario: Attach
- **WHEN** the user attaches a photo and sends
- **THEN** the comment shows the photo as an attachment on the ticket

#### Scenario: Failed reply keeps the draft
- **WHEN** sending is refused
- **THEN** an error shows and the draft and attachments stay

### Requirement: Ticket notifications open the ticket
Tapping a push notification that carries a ticket id (a Nurling mentioned the user on a ticket, a
ticket is overdue) SHALL open the Ticket screen for that ticket in the notification's space, and
`rakazo://ticket` links SHALL do the same. A notification without a ticket id SHALL keep opening
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

### Requirement: Board logic is shared between web and mobile
Board columns, card fields and date labels, quick-add parsing, mention parsing and picker options,
and the merged activity with its separator rows SHALL be implemented once in `@rakazo/core` and
used by both the web and the mobile clients.

#### Scenario: One implementation
- **WHEN** the rule for which tickets a column shows changes
- **THEN** it changes in one place and both clients follow
