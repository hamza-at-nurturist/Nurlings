## ADDED Requirements

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

## MODIFIED Requirements

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
