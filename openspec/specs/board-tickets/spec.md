# board-tickets Specification

## Purpose
Defines how a Board ticket opens on web and desktop: a two-pane modal with in-place properties, the files its owner attached, and a live activity feed of status changes and comments, where a user's reply wakes the owning Nurling and ticket runs surface blocking questions and deliverables on the ticket.

## Requirements

### Requirement: Ticket modal
Opening an existing ticket on the web or desktop Board SHALL show a two-pane modal. The left pane
SHALL show the title, a properties row with status, owner and priority, the description, and the
files the owning Nurling produced for the ticket. The right pane SHALL show the ticket's activity
and a reply box.

#### Scenario: Open a ticket
- **WHEN** the user opens a ticket card
- **THEN** the modal shows the ticket's title, status, owner, priority and description

#### Scenario: Edit in place
- **WHEN** the user picks another status, owner or priority, or edits the title or description and leaves the field
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
ticket's owning Nurling, whose prompt tells it to read the ticket and its new comments. A comment
by a Nurling SHALL NOT start any run. A comment on a done or closed ticket SHALL NOT start a run.

#### Scenario: User replies on an open ticket
- **WHEN** a user comments on an open ticket that has an owner
- **THEN** the owner starts a run that reads the ticket

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
