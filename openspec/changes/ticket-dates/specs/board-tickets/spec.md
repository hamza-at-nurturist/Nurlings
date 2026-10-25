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
- **WHEN** the user chooses to create a ticket
- **THEN** the existing create dialog is used

## ADDED Requirements

### Requirement: Start and due dates
A ticket SHALL have an optional start and an optional due, each a date or a date with a time. The
user SHALL set either one from the modal with one picker that offers Today, Tomorrow, This weekend,
Next week, a calendar, an optional time and No date. A date without a time SHALL mean 9 AM for a
start and the end of the day for a due, in the acting user's saved timezone (UTC when none is
saved). A start later than the due SHALL be refused.

#### Scenario: Quick pick
- **WHEN** the user picks Tomorrow for the due
- **THEN** the ticket is due at the end of tomorrow in the user's timezone and shows "Tomorrow"

#### Scenario: With a time
- **WHEN** the user picks a date in the calendar and adds 3 PM for the start
- **THEN** the start is 3 PM on that date in the user's timezone

#### Scenario: Clear
- **WHEN** the user picks No date
- **THEN** that date is removed

#### Scenario: Start after due
- **WHEN** the user sets a start later than the ticket's due
- **THEN** the change is refused and the dates are unchanged

### Requirement: Dates read short on the modal and the card
The modal and the ticket's card on the Board SHALL show its dates short and relative to today in the
user's timezone, such as "Tomorrow", "Fri 3 PM" or "Nov 4". A card SHALL show dates only when the
ticket has some. A due that has passed SHALL show in the destructive color while the ticket is not
In review, Done or Won't do.

#### Scenario: Card with dates
- **WHEN** a ticket has a start and a due
- **THEN** its card shows both on one line

#### Scenario: Overdue
- **WHEN** a ticket's due has passed and it is In progress
- **THEN** its due shows in the destructive color

#### Scenario: Done late
- **WHEN** a ticket's due has passed and it is Done
- **THEN** its due shows in the normal color

### Requirement: A future start defers the owner's wake
Assigning a ticket whose start is in the future SHALL NOT wake the owner. When the start arrives,
the owner SHALL be woken once if the ticket has an owner and is not In review, Done or Won't do. When
a start that was still in the future is cleared, or moved to now or earlier, while the ticket has an
owner and is not In review, Done or Won't do, the owner SHALL be woken right away. Comments and
mentions SHALL wake as before.

#### Scenario: Assigned before its start
- **WHEN** the user creates a ticket starting next Monday
- **THEN** the owner is not woken until Monday at the start time

#### Scenario: Start arrives
- **WHEN** the start time of a To do ticket with an owner arrives
- **THEN** the owner is woken once

#### Scenario: Start brought forward
- **WHEN** the user clears a future start on an assigned To do ticket
- **THEN** the owner is woken now

#### Scenario: Already in review
- **WHEN** the start time arrives for a ticket that is In review
- **THEN** no one is woken

### Requirement: One heads-up before the due
Before a ticket's due the owner SHALL be woken once: 3 hours before when the due has a time, at
9 AM on the due date when it does not. The wake SHALL happen only while the ticket is not In
review, Done or Won't do, and SHALL tell the Nurling the ticket is due and to finish it or comment
what is blocking it. A heads-up whose time has already passed when the due is set SHALL be skipped.

#### Scenario: Due with a time
- **WHEN** a ticket In progress is due Friday at 3 PM
- **THEN** its owner is woken once at noon on Friday with the due-soon prompt

#### Scenario: Due without a time
- **WHEN** a To do ticket is due Friday
- **THEN** its owner is woken once at 9 AM on Friday

#### Scenario: Finished early
- **WHEN** the heads-up time comes for a ticket that is In review
- **THEN** no one is woken

### Requirement: The user is told once when a ticket is overdue
When a ticket's due passes and the ticket is not In review, Done or Won't do, the user SHALL get one
push through the existing push channel, honouring the owning Nurling's notification setting as a
mention push does. A due that is already past when it is set SHALL NOT push.

#### Scenario: Overdue
- **WHEN** a ticket's due passes while it is In progress
- **THEN** the user gets one push naming the ticket as overdue

#### Scenario: Finished in time
- **WHEN** a ticket's due passes after it moved to Done
- **THEN** no push is sent

### Requirement: Date reminders use the existing job scheduling
Date reminders SHALL be found by the existing job reconciler with its lookahead and run as worker
jobs, without a new scheduler. Any date change SHALL recompute the ticket's next reminder time and
reset the reminders of the changed date. A job SHALL re-read the ticket when it runs and SHALL do
nothing when the ticket's dates or status no longer call for it. Each reminder SHALL happen at most
once per date.

#### Scenario: Due moved later
- **WHEN** a heads-up job is queued and the user then moves the due a week later
- **THEN** the queued job does nothing and the heads-up comes before the new due

#### Scenario: Due moved again after a heads-up
- **WHEN** the owner got the heads-up and the user then sets a new due
- **THEN** the owner gets one heads-up before the new due

### Requirement: Nurlings set dates
`ticket_create` and `ticket_update` SHALL accept a start and a due as a local date or local date-time
in the user's timezone, or null to clear, resolved by the same rules as the picker. Ticket reads
SHALL include the dates.

#### Scenario: By Friday
- **WHEN** a Nurling sets due to Friday's date with `ticket_update`
- **THEN** the ticket is due at the end of Friday in the user's timezone

### Requirement: Ticket files show a short type
On the ticket's Files, a file card that shows a type SHALL show a short extension such as "TXT"
instead of the MIME type. Chat file cards SHALL be unchanged.

#### Scenario: Text file
- **WHEN** the ticket has a 22-byte `notes.txt`
- **THEN** its card reads "TXT · 22 B"
