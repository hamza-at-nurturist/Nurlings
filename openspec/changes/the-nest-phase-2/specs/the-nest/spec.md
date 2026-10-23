## ADDED Requirements

### Requirement: Cards are ordered by what needs attention
The snapshot SHALL list Nurlings with needs you first, then error, then working, then every other
mood, keeping the existing roster order inside each group. Clients SHALL render that order.

#### Scenario: Problems first
- **WHEN** a quiet Nurling comes before a waiting one and a failed one in the roster
- **THEN** the waiting one is first, the failed one second, and the quiet one after them

### Requirement: Idle cards show the last activity
A card with no current task whose Nurling is not waiting on the user SHALL show when the Nurling
last finished a run and what it was, taken from its newest finished non-background run. A Nurling
that never ran SHALL show nothing.

#### Scenario: Idle with history
- **WHEN** a Nurling is idle and its last run finished at 8:12 AM
- **THEN** its card shows "Last active 8:12 AM" followed by that run's task on one line

#### Scenario: Working Nurling
- **WHEN** a Nurling has a current task
- **THEN** its card shows the task and not the last activity

### Requirement: Cards show today's stats
Each card SHALL show, for runs and usage since the start of the user's local day, the runs done,
the runs failed when above zero, the routine-started runs and the tokens used, and SHALL hide the
line when all are zero. The start of the day SHALL come from the client, bounded to the last 24
hours by the server.

#### Scenario: Some failures
- **WHEN** a Nurling finished four runs today and one failed
- **THEN** its line shows the failed count

#### Scenario: Nothing today
- **WHEN** a Nurling has no finished runs and no usage today
- **THEN** its card shows no stats line

#### Scenario: Old client
- **WHEN** a snapshot is requested without a start of day
- **THEN** the server uses the start of the current UTC day

## MODIFIED Requirements

### Requirement: The eyes badge is a status indicator
Each card SHALL show its mood with a ring around the avatar and a text label naming the mood. The
ring SHALL use semantic status colors and a style that differs by mood without relying on color
alone, SHALL NOT replace the avatar, and SHALL NOT animate under `prefers-reduced-motion`. The
card SHALL NOT draw eyes over the avatar.

#### Scenario: Waiting versus idle
- **WHEN** one Nurling needs the user and another is idle
- **THEN** the first shows a warning ring and the label "Needs you" and the second a neutral ring
  and the label "Idle"

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** a working card shows its ring and label without animation

### Requirement: Needs you tray
The Nest SHALL show, above the cards, every pending ask across the space's Nurlings and SHALL
render nothing when there are none. A plain question that carries explicit options SHALL show
those options as buttons that answer it in place with the existing answer call. Every other ask
(secret, login, approval, takeover) SHALL only open the Nurling's thread. Secret requests SHALL
show who is asking but not the request's content.

#### Scenario: Pending ask
- **WHEN** a Nurling's run waits on an ask
- **THEN** the tray lists it with the Nurling and the question, and its Open button goes to the
  thread

#### Scenario: Question with options
- **WHEN** a Nurling asks a question with three options
- **THEN** the tray shows the three options, and choosing one sends that option as the answer to
  the ask's run and message

#### Scenario: Failed answer
- **WHEN** sending the answer fails
- **THEN** the item stays, shows the error, and its buttons work again

#### Scenario: Approval or secret
- **WHEN** a Nurling asks for an approval or a password
- **THEN** the tray item has no answer buttons and its Open button goes to the thread

#### Scenario: Secret request
- **WHEN** a Nurling asks for a password
- **THEN** the tray item does not include the request's text

#### Scenario: Group thread
- **WHEN** the ask was made in a group thread
- **THEN** Open, and an answer given from the tray, go to the group's thread
