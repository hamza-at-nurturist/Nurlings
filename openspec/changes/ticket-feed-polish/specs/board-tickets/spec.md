## MODIFIED Requirements

### Requirement: Ticket activity
The activity SHALL merge status and ownership changes, files and comments in time order, newest at
the bottom, and SHALL update while the modal is open without a reload. Status and ownership
changes SHALL be recorded when they happen, by the user or by a Nurling, with who made them. A
reply that sends the ticket back to work SHALL be recorded without an actor and read "Moved back
to In progress". The feed SHALL show a centered time separator, using chat's rule and format,
before the first item and wherever chat would show one, and items with no separator between them
SHALL sit closer together than items after one.

#### Scenario: Status change appears
- **WHEN** a ticket's status changes by hand while the modal is open
- **THEN** a line naming who moved it and the new status appears at the bottom of the activity

#### Scenario: Comment appears
- **WHEN** someone comments on the ticket while the modal is open
- **THEN** the comment appears at the bottom of the activity

#### Scenario: Ticket without history
- **WHEN** a ticket was created before changes were recorded
- **THEN** the activity starts with a created line derived from the ticket's creation time, followed by its comments

#### Scenario: Time gap
- **WHEN** two consecutive items are on different days or at least 15 minutes apart
- **THEN** a separator such as "Today 11:20 AM" or "Yesterday 4 PM" sits between them

#### Scenario: Close in time
- **WHEN** two consecutive items are less than 15 minutes apart on the same day
- **THEN** no separator sits between them and their spacing is tighter

#### Scenario: Automatic move
- **WHEN** a user's reply moves the ticket back to In progress
- **THEN** the feed reads "Moved back to In progress" with no actor

### Requirement: A user's reply sends a ticket back to work
A comment by a user on a ticket that is In review or Blocked SHALL move the ticket to In progress,
record that move in the activity without an actor, and wake the owner as any user comment does,
unless the comment's mentions are only Nurlings other than the owner. The comment and the move
SHALL be saved together. A Nurling's comment SHALL NOT change a ticket's status.

#### Scenario: Reply to a ticket in review
- **WHEN** the user comments on a ticket that is In review
- **THEN** the ticket becomes In progress, the feed reads "Moved back to In progress", and the owner is woken

#### Scenario: Reply to a blocked ticket
- **WHEN** the user comments on a ticket that is Blocked
- **THEN** the ticket becomes In progress and the owner is woken

#### Scenario: Addressed to another Nurling
- **WHEN** the user comments on a ticket that is In review mentioning only a Nurling that is not the owner
- **THEN** the status is unchanged and only the mentioned Nurling is woken

#### Scenario: Other statuses
- **WHEN** the user comments on a ticket that is To do or In progress
- **THEN** its status is unchanged

### Requirement: Attach files to a ticket
In the ticket modal, the user SHALL be able to attach files with the reply box's attach control or
by dropping them on the modal, with chat's accepted types and limits. Files SHALL upload when the
reply is sent, through the same upload path chat uses, and the comment SHALL carry them; a comment
MAY have files and no text. Only files of the same space, user and owning Nurling SHALL be accepted.

#### Scenario: Attach in the reply box
- **WHEN** the user picks a file with the attach control and sends
- **THEN** the comment shows the file and the Files list shows it with "You" in its meta line

#### Scenario: Drop on the modal
- **WHEN** the user drops a file on the modal
- **THEN** it is staged in the reply box and nothing uploads until they send

#### Scenario: Foreign file
- **WHEN** a comment names a file of another user or Nurling
- **THEN** the comment is refused

## ADDED Requirements

### Requirement: Files appear in the activity
Each file on a ticket SHALL appear in the activity as a small grey line at the time it was added,
reading "{Nurling} attached {name}" for a file a Nurling attached and "You attached {name}" for
one the user attached.

#### Scenario: Nurling file
- **WHEN** Runway attaches Finance best practices.pdf during a run for the ticket
- **THEN** the feed shows "Runway attached Finance best practices.pdf"

#### Scenario: User file
- **WHEN** the user sends a comment with listing-notes.txt
- **THEN** the feed shows "You attached listing-notes.txt" before the comment

### Requirement: Ticket files name their producer in the meta line
A ticket file card SHALL show who added the file at the start of its meta line, as "Runway · 7.3 KB"
or "You · 22 B", and SHALL NOT show a separate caption under the card.

#### Scenario: Nurling file card
- **WHEN** a file a Nurling attached is listed
- **THEN** its meta line reads the Nurling's name, then its size

#### Scenario: User file card
- **WHEN** a file the user attached is listed
- **THEN** its meta line reads "You", then its size

### Requirement: The feed shows a working Nurling
While a Nurling has a queued, leased or running run started for the ticket, the end of the activity
SHALL show "{name} is working…" with the app's AI shimmer. The line SHALL disappear when the run
ends or waits on the user, and SHALL NOT appear for runs unrelated to the ticket.

#### Scenario: Owner is working
- **WHEN** the owner has a running run for the ticket
- **THEN** the feed ends with "{owner} is working…"

#### Scenario: Busy elsewhere
- **WHEN** the owner is working in a chat and has no active run for the ticket
- **THEN** no working line is shown

#### Scenario: Mentioned Nurling
- **WHEN** a mentioned Nurling has an active run for the ticket
- **THEN** the feed shows that Nurling's working line

### Requirement: A failed run is shown
If a Nurling's latest run for the ticket failed, the activity SHALL end with "{name} couldn't
finish, reply to retry" until that Nurling has a newer run for the ticket.

#### Scenario: Run fails
- **WHEN** the owner's latest run for the ticket fails
- **THEN** the feed shows "{owner} couldn't finish, reply to retry"

#### Scenario: Retried
- **WHEN** the user replies and the owner starts a new run
- **THEN** the failure line is gone

### Requirement: The ticket modal can fill the window
The modal header SHALL have an icon button next to close that toggles the modal between its normal
size and filling the window, named "Expand" or "Collapse". The choice SHALL be remembered per
browser, and the modal SHALL still open at its normal size when storage is unavailable.

#### Scenario: Expand
- **WHEN** the user presses Expand
- **THEN** the modal fills the window and the button reads Collapse

#### Scenario: Remembered
- **WHEN** the user reopens a ticket after expanding
- **THEN** it opens expanded

#### Scenario: Storage unavailable
- **WHEN** reading or writing browser storage throws
- **THEN** the modal opens at its normal size and the button still works
