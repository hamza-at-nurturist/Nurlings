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
record that move in the activity, and wake the owner as any user comment does. The comment and the
move SHALL be saved together. A Nurling's comment SHALL NOT change a ticket's status.

#### Scenario: Reply to a ticket in review
- **WHEN** the user comments on a ticket that is In review
- **THEN** the ticket becomes In progress, the move is in the feed, and the owner is woken

#### Scenario: Reply to a blocked ticket
- **WHEN** the user comments on a ticket that is Blocked
- **THEN** the ticket becomes In progress and the owner is woken

#### Scenario: Other statuses
- **WHEN** the user comments on a ticket that is To do or In progress
- **THEN** its status is unchanged

### Requirement: Show when a ticket needs the user
A ticket whose latest comment is a Nurling's comment that mentions the user SHALL show a Needs you
badge on its card and in its modal while it is not Done or Won't do. The badge SHALL clear when the
user comments or when a later comment of the Nurling does not mention the user.

#### Scenario: Badge appears
- **WHEN** a Nurling comments on a ticket mentioning the user
- **THEN** the card and the modal show Needs you

#### Scenario: Badge clears
- **WHEN** the user replies on that ticket
- **THEN** the badge is gone
