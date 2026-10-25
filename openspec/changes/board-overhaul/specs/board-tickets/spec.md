## MODIFIED Requirements

### Requirement: Ticket modal
Opening an existing ticket on the web or desktop Board SHALL show a two-pane modal. The left pane
SHALL show the title, a properties row with status, owner, priority, start and due, the description,
and the files the owning Nurling produced for the ticket. The right pane SHALL show the ticket's
activity and a reply box.

#### Scenario: Open a ticket
- **WHEN** the user opens a ticket card
- **THEN** the modal shows the ticket's title, status, owner, priority, start, due and description

#### Scenario: Edit in place
- **WHEN** the user picks another status, owner, priority, start or due, or edits the title or description and leaves the field
- **THEN** the ticket is updated and the modal shows the new value

#### Scenario: Attached deliverable
- **WHEN** the owning Nurling attaches a file with `attach_file` during a run started for the ticket
- **THEN** the file is listed under the ticket's files, and a newer attachment of the same name replaces it in the list

#### Scenario: Workspace-only file
- **WHEN** the Nurling only writes a file in its workspace and does not attach it
- **THEN** the file is not listed

#### Scenario: No files
- **WHEN** the owning Nurling attached no files for the ticket
- **THEN** no files section is shown

#### Scenario: New ticket
- **WHEN** the user wants to create a ticket
- **THEN** they use the board's quick-add box, and there is no separate create dialog

## ADDED Requirements

### Requirement: Quick-add a ticket
The Board header SHALL have a quick-add box. Pressing Enter SHALL create a ticket from its text: the
first line is the title and the rest, if any, the description. Shift+Enter SHALL add a line. Typing
`@` SHALL open the Nurling picker; the first picked Nurling still named in the text SHALL become the
owner and its `@Name` SHALL be removed from the title and description. Empty text SHALL create
nothing.

#### Scenario: One line
- **WHEN** the user types "Weekly cash flow summary" and presses Enter
- **THEN** a To do ticket with that title and no description is created and the box clears

#### Scenario: Several lines
- **WHEN** the text has a first line and more lines below it
- **THEN** the first line is the title and the rest is the description

#### Scenario: Owner by mention
- **WHEN** the user picks Scout from the `@` picker and presses Enter on "@Scout skip trace 12 owners"
- **THEN** the ticket is owned by Scout, its title is "skip trace 12 owners", and Scout is woken

### Requirement: Chief takes tickets without an owner
A ticket a user creates without an owner SHALL be assigned to the user's first Nurling in the space
(Chief, created at onboarding), and Chief SHALL be woken with a prompt telling it to reassign the
ticket to the best Nurling or work on it itself. When the user has no Chief in the space, the
ticket SHALL be created without an owner and no Nurling SHALL be woken. A ticket a Nurling creates
SHALL keep its current owner rules.

#### Scenario: No mention
- **WHEN** the user quick-adds a ticket without mentioning a Nurling and has Chief
- **THEN** the ticket is owned by Chief and Chief is woken to triage it

#### Scenario: Chief hands it on
- **WHEN** Chief reassigns that ticket to Scout
- **THEN** Scout is woken as for any reassignment

#### Scenario: No Chief
- **WHEN** the user has archived or deleted Chief and quick-adds without a mention
- **THEN** the ticket is created without an owner and no Nurling is woken

### Requirement: Board columns
The Board SHALL show six columns, To do, In progress, In review, Blocked, Done and Won't do, each
with a status dot and a count of the cards it holds. While In review has cards it SHALL be tinted
and show a "Your turn" pill. Done SHALL show tickets completed in the last 7 days and, when there
are older ones, a "Show N older" control that reveals them.

#### Scenario: Your turn
- **WHEN** a ticket is In review
- **THEN** the In review column is tinted and shows Your turn

#### Scenario: Old Done tickets
- **WHEN** Done holds two tickets completed this week and six completed earlier
- **THEN** Done shows the two, its count is 8, and "Show 6 older" reveals the other six

### Requirement: Board cards show live state
A card SHALL show the ref, the Needs you badge when it applies, and the title. While a Nurling has a
queued, leased or running run for the ticket the card SHALL show "{name} is working…" in the
shimmer with the owner's avatar working; otherwise the latest comment's text, at most two lines, or
nothing. The footer SHALL show the owner's avatar and name, the card dates, and the file count when
there are files.

#### Scenario: Working
- **WHEN** the owner's run for the ticket is running
- **THEN** the card shows "{owner} is working…" and the avatar works

#### Scenario: Last comment
- **WHEN** no run is active and the latest comment is long
- **THEN** the card shows its text clipped to two lines

#### Scenario: Files
- **WHEN** the ticket has two files
- **THEN** the card shows a file count of 2

### Requirement: Act on a card
Clicking a card SHALL open the ticket modal. A card in In review SHALL have an Approve button that
approves the ticket without opening the modal.

#### Scenario: Open
- **WHEN** the user clicks a card
- **THEN** the ticket modal opens for that ticket

#### Scenario: Approve from the card
- **WHEN** the user clicks Approve on an In review card
- **THEN** the ticket moves to Done, records that the user approved it, and the modal does not open

### Requirement: Card fields come with the ticket list
The ticket list SHALL return each ticket's latest comment text, file count and working Nurling,
read with a fixed number of queries for the whole list, not per ticket. The file count SHALL equal
the number of files the ticket's files list shows.

#### Scenario: Many tickets
- **WHEN** the board holds 50 tickets
- **THEN** loading it reads the card fields in the same number of queries as for 1 ticket

### Requirement: Filter the board by Nurling
The Board header SHALL offer All and one avatar button per Nurling. Choosing a Nurling SHALL show
only tickets it owns, with column counts for those tickets; All SHALL show every ticket, including
unowned ones.

#### Scenario: Filter
- **WHEN** the user chooses Scout
- **THEN** only Scout's tickets are shown and the counts match them

### Requirement: Move cards between columns
The user SHALL be able to drag a card to another column to change its status, and SHALL be able to
do the same from a "Move to" menu on the card with the keyboard or touch. A move SHALL show at once
and SHALL revert with an error if the server refuses it.

#### Scenario: Drag
- **WHEN** the user drags a To do card onto In progress
- **THEN** the ticket is In progress

#### Scenario: Menu
- **WHEN** the user opens a card's Move to menu and picks Blocked
- **THEN** the ticket is Blocked

### Requirement: Board layout adapts to its width
The Board SHALL lay out by its own width: all six columns visible when wide; fixed-width columns
that scroll sideways with snap when narrower; the quick-add box on its own row at tablet width; and
at phone width a stacked header (title, a sideways-scrolling filter, quick-add) with columns about
84% wide so the next one peeks in. The page itself SHALL never scroll sideways.

#### Scenario: Desktop
- **WHEN** the board is 1440 px wide
- **THEN** all six columns are visible without scrolling

#### Scenario: Phone
- **WHEN** the board is 390 px wide
- **THEN** the header is stacked, one column fills most of the width and the next one shows at the edge
