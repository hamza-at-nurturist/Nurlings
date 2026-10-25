# board-tickets Specification

## Purpose
Defines how a Board ticket opens on web and desktop: a two-pane modal with in-place properties, the files its owner attached, and a live activity feed of status changes and comments. A user's reply wakes the owning Nurling and sends a ticket in review or blocked back to work, a ticket in review is approved with one action, a ticket shows when a Nurling needs the user, the user attaches files that every Nurling on the ticket can read (images shown to models that can see), tickets carry an optional start and due that hold the owner's wake until the start, give it one heads-up before the due and tell the user once when it is overdue, ticket runs surface blocking questions and deliverables on the ticket, and @-mentions call in other Nurlings (or notify the user) with chips, comment-only runs and loop guards, while one owner per ticket stays.

## Requirements

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

### Requirement: Ticket activity
The activity SHALL merge status and ownership changes with comments in time order, newest at the
bottom, and SHALL update while the modal is open without a reload. Status and ownership changes
SHALL be recorded when they happen, by the user or by a Nurling, with who made them.

#### Scenario: Status change appears
- **WHEN** a ticket's status changes while the modal is open
- **THEN** a line naming who moved it and the new status appears at the bottom of the activity

#### Scenario: Comment appears
- **WHEN** someone comments on the ticket while the modal is open
- **THEN** the comment appears at the bottom of the activity

#### Scenario: Ticket without history
- **WHEN** a ticket was created before changes were recorded
- **THEN** the activity starts with a created line derived from the ticket's creation time, followed by its comments

### Requirement: People and Nurlings render with their own avatars
Wherever the modal shows a Nurling it SHALL use the app's existing Nurling avatar, with its idle
or working state. A user SHALL show their profile picture, or their initial when there is none.

#### Scenario: Nurling owner
- **WHEN** the owner is a Nurling with a classic, organic or uploaded avatar
- **THEN** the modal shows it exactly as the rest of the app does

### Requirement: A user comment wakes the owner
A comment by a user on a ticket whose status is not done or closed SHALL start a run of the
ticket's owning Nurling, whose prompt tells it to read the ticket and its new comments, unless the
comment's stored mentions are only Nurlings other than the owner. A comment by a Nurling SHALL NOT
start any run. A comment on a done or closed ticket SHALL NOT start a run.

#### Scenario: User replies on an open ticket
- **WHEN** a user comments on an open ticket that has an owner
- **THEN** the owner starts a run that reads the ticket

#### Scenario: Comment addressed to others
- **WHEN** a user comments on an open ticket mentioning only Nurlings that are not its owner
- **THEN** the owner is not woken

#### Scenario: Owner among the mentions
- **WHEN** a user comments mentioning the owner and another Nurling
- **THEN** the owner is woken as for any reply

#### Scenario: Nurling comments
- **WHEN** a Nurling comments on a ticket
- **THEN** no Nurling is woken

#### Scenario: Finished ticket
- **WHEN** a user comments on a done or closed ticket
- **THEN** no run is started

#### Scenario: Rapid replies
- **WHEN** a user comments again before the owner's queued run has started
- **THEN** no second run is queued

### Requirement: Ticket run guidance covers blocking and deliverables
When a Nurling working a ticket is blocked on the user, its instructions SHALL tell it to comment
the question on the ticket, set the ticket to Blocked, and still send its normal ask or approval
card. The instructions SHALL also tell it to attach anything the user should see or download, such
as reports, CSVs and documents, with `attach_file`, and not to attach scratch or working files.

#### Scenario: Guidance
- **WHEN** a ticket run starts
- **THEN** the run's guidance includes commenting the question, setting Blocked, and sending the ask card, and attaching deliverables but not scratch files

### Requirement: Mention a Nurling from the reply box
In the ticket modal's reply box, typing `@` SHALL open a picker of the space's Nurlings. Choosing one
SHALL add a name chip to the reply and `@Name` to its text, and sending SHALL record the mention
with the comment. Chips SHALL render in the feed. A Nurling's chip SHALL use that Nurling's own hex
color, taken before any `::`, as a tinted background with the name in full color; if the color is not
a hex value, or for a user, the chip SHALL be neutral.

#### Scenario: Open the picker
- **WHEN** the user types `@` in the reply box and the space has Nurlings
- **THEN** a picker lists them, narrows as the user types, and picking one adds its chip

#### Scenario: Chip color
- **WHEN** a comment mentions a Nurling whose color is `#7C3AED::shape_8`
- **THEN** its chip is tinted with `#7C3AED` and its name is shown in `#7C3AED`

#### Scenario: Neutral chip
- **WHEN** a comment mentions a user, or a Nurling whose color is not a hex value
- **THEN** its chip is neutral

### Requirement: A user mention wakes a non-owner for that ticket only
A user's comment that mentions a Nurling that is not the ticket's owner SHALL start a run of that
Nurling, whose prompt tells it to read the ticket and reply with one comment. In that run the Nurling
SHALL NOT be able to update the ticket in any way (status, owner, title, description, priority or
any other field), and SHALL NOT be able to post a second comment on the ticket. The ticket's owner SHALL remain unchanged.

#### Scenario: Ask another Nurling
- **WHEN** a user comments on an open ticket mentioning a Nurling that is not the owner
- **THEN** that Nurling starts a run for the ticket

#### Scenario: Comment only
- **WHEN** a Nurling woken by a mention calls `ticket_update` on the ticket, for any field
- **THEN** the call is refused and the ticket is unchanged

#### Scenario: Other tickets and an owner's own runs
- **WHEN** a mention-woken Nurling updates a different ticket, or the owner updates its own ticket in an ordinary run
- **THEN** the update is allowed

#### Scenario: One reply
- **WHEN** a Nurling woken by a mention tries to post a second comment on the ticket
- **THEN** the second comment is refused

#### Scenario: Finished ticket
- **WHEN** a mention is made on a done or closed ticket
- **THEN** no run is started

#### Scenario: Not a Nurling of the user
- **WHEN** a mention names a Nurling that is archived, in another space, or another user's
- **THEN** it wakes nothing and renders as plain text

### Requirement: Nurlings can mention each other
A Nurling SHALL be able to mention other Nurlings, and the user, in a ticket comment through
`ticket_comment`. A mention of a Nurling by a Nurling SHALL start a run of the mentioned Nurling for
the ticket, and a mention of the owner by another Nurling SHALL wake the owner as a normal ticket
wake.

#### Scenario: Owner asks for help
- **WHEN** the owner comments on its ticket mentioning an idle Nurling
- **THEN** that Nurling starts a run for the ticket

#### Scenario: Nurling asks the owner
- **WHEN** a Nurling that is not the owner comments on the ticket mentioning the owner
- **THEN** the owner starts a normal ticket run

### Requirement: Wakes started by a Nurling are bounded
A mention by a Nurling SHALL NOT wake the commenting Nurling itself, SHALL NOT wake a Nurling that is
already working on the ticket, and SHALL be limited to 10 wakes per ticket per hour; beyond the limit
the comment is stored and no run starts. Mentions by a user SHALL NOT be subject to the working check
or the limit.

#### Scenario: Already working
- **WHEN** a Nurling mentions a Nurling that has a queued, leased or running run for the same ticket
- **THEN** no new run is started

#### Scenario: Cap
- **WHEN** ten wakes started by Nurling mentions have been made on a ticket within the last hour
- **THEN** a further Nurling mention on that ticket starts no run

#### Scenario: Self mention
- **WHEN** a Nurling mentions itself
- **THEN** no run is started

#### Scenario: A user is not limited
- **WHEN** a user mentions a Nurling that is already working on the ticket, after ten Nurling-started wakes
- **THEN** the mention is handled as any user mention, without the working check or the limit

### Requirement: A Nurling mentioning the user notifies them
A Nurling's comment that mentions the user SHALL send the user a notification naming the Nurling and
the ticket, with the start of the comment, if the Nurling's notify-on-finish setting is on.

#### Scenario: Notify
- **WHEN** a Nurling comments on a ticket mentioning the user and its notify-on-finish setting is on
- **THEN** the user receives a notification titled "{Nurling} mentioned you on {ref}"

#### Scenario: Setting off
- **WHEN** the Nurling's notify-on-finish setting is off
- **THEN** the comment and its chip are stored and shown, and no notification is sent

### Requirement: One owner per ticket
A ticket SHALL keep exactly one owner. A mention SHALL NOT assign, share or change ownership.

#### Scenario: Mention does not reassign
- **WHEN** a Nurling that is not the owner is mentioned and replies
- **THEN** the ticket's owner is unchanged

### Requirement: Approve a ticket in review
A ticket that is In review SHALL show one Approve action in its modal. Approving SHALL move the
ticket to Done and record an "approved" entry in its activity. Approving SHALL be refused for a
ticket that is not In review. There SHALL be no reject action and no Nurling tool that approves.

#### Scenario: Approve
- **WHEN** the user clicks Approve on a ticket that is In review
- **THEN** the ticket is Done and the feed shows that the user approved it

#### Scenario: Stale approve
- **WHEN** Approve is sent for a ticket that has since left In review
- **THEN** the request is refused and the ticket is unchanged

### Requirement: A user's reply sends a ticket back to work
A comment by a user on a ticket that is In review or Blocked SHALL move the ticket to In progress,
record that move in the activity, and wake the owner as any user comment does, unless the comment's
mentions are only Nurlings other than the owner. The comment and the move SHALL be saved together.
A Nurling's comment SHALL NOT change a ticket's status.

#### Scenario: Reply to a ticket in review
- **WHEN** the user comments on a ticket that is In review
- **THEN** the ticket becomes In progress, the move is in the feed, and the owner is woken

#### Scenario: Reply to a blocked ticket
- **WHEN** the user comments on a ticket that is Blocked
- **THEN** the ticket becomes In progress and the owner is woken

#### Scenario: Addressed to another Nurling
- **WHEN** the user comments on a ticket that is In review mentioning only a Nurling that is not the owner
- **THEN** the status is unchanged and only the mentioned Nurling is woken

#### Scenario: Other statuses
- **WHEN** the user comments on a ticket that is To do or In progress
- **THEN** its status is unchanged

### Requirement: Show when a ticket needs the user
A ticket whose latest comment is a Nurling's comment that mentions the user SHALL show a Needs you
badge on its card and in its modal while it is not Done or Won't do. The badge SHALL clear when the
user comments, when the user changes the ticket's status, or when a later comment of the Nurling does
not mention the user.

#### Scenario: Badge appears
- **WHEN** a Nurling comments on a ticket mentioning the user
- **THEN** the card and the modal show Needs you

#### Scenario: Badge clears
- **WHEN** the user replies on that ticket
- **THEN** the badge is gone

#### Scenario: Status changed by hand
- **WHEN** the user changes the status of a ticket that shows Needs you
- **THEN** the badge is gone

### Requirement: Attach files to a ticket
In the ticket modal, the user SHALL be able to attach files with the reply box's attach control or
by dropping them on the modal, with chat's accepted types and limits. Files SHALL upload when the
reply is sent, through the same upload path chat uses, and the comment SHALL carry them; a comment
MAY have files and no text. Only files of the same space, user and owning Nurling SHALL be accepted.

#### Scenario: Attach in the reply box
- **WHEN** the user picks a file with the attach control and sends
- **THEN** the comment shows the file and the Files list shows it labelled "You"

#### Scenario: Drop on the modal
- **WHEN** the user drops a file on the modal
- **THEN** it is staged in the reply box and nothing uploads until they send

#### Scenario: Foreign file
- **WHEN** a comment names a file of another user or Nurling
- **THEN** the comment is refused

### Requirement: Nurlings can read a ticket's files
`ticket_get` SHALL list the ticket's files, both the user's and the Nurlings', with name, type, size,
who added it, and a path. When the Nurling next uses a file tool in that run, the files SHALL be copied
to those paths by the same mechanism as chat attachments.

#### Scenario: Owner reads an upload
- **WHEN** the owner is woken by a reply carrying a file and calls `ticket_get`
- **THEN** the file is listed with its path, and reading that path with a file tool returns its contents

#### Scenario: Mentioned Nurling
- **WHEN** a Nurling woken by a mention calls `ticket_get`
- **THEN** it sees and can read the same files

#### Scenario: Photos are visible to a model that can see
- **WHEN** the ticket has a JPEG photo and the Nurling's model accepts images
- **THEN** `ticket_get` returns that photo as image content alongside the ticket

#### Scenario: Model without vision
- **WHEN** the Nurling's model does not accept images
- **THEN** `ticket_get` returns no image content and still lists the photo with its path

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
