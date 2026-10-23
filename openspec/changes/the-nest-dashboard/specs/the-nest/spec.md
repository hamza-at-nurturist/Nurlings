## ADDED Requirements

### Requirement: The Nest shows every Nurling at a glance
The web app, and so the desktop app, SHALL provide a screen at `/app/nest` listing every
non-archived Nurling of the current space as a card with its existing avatar, a mood badge, its
current task and its next scheduled routine.

#### Scenario: Cards for all active Nurlings
- **WHEN** the user opens The Nest in a space with three Nurlings and one archived Nurling
- **THEN** three cards are shown and the archived one is not

#### Scenario: Current task
- **WHEN** a Nurling has an active run
- **THEN** its card shows the run's prompt on one line

#### Scenario: Next routine
- **WHEN** a Nurling has an active scheduled routine
- **THEN** its card shows that routine's name and next run time, and a change-watching routine's
  next check is not shown as a run

### Requirement: Mood is derived by the server from existing state
The server SHALL return one mood per Nurling: needs approval when its latest run is
`waiting_input` or `waiting_takeover`; otherwise error when its latest run failed; otherwise
working when a run is `queued`, `leased` or `running`; otherwise sleeping when it has no armed
routine and no run in the last 24 hours; otherwise idle. Clients SHALL render the returned mood
and SHALL NOT derive it.

#### Scenario: Waiting beats failure
- **WHEN** a Nurling is waiting on the user and also has an earlier failed run
- **THEN** its mood is needs approval

#### Scenario: Quiet Nurling
- **WHEN** a Nurling has no armed routine and no run in 24 hours
- **THEN** its mood is sleeping

#### Scenario: Waiting on a routine
- **WHEN** a Nurling is idle but has an armed routine
- **THEN** its mood is idle

### Requirement: The eyes badge is a status indicator
Each card SHALL show a small badge drawn from the logo's two slanted eyes, with a distinct look
and a subtle animation per mood. The badge SHALL NOT replace the avatar, SHALL name the mood
accessibly, and SHALL NOT animate under `prefers-reduced-motion`.

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** the badge renders each mood without animation and keeps its accessible name

### Requirement: Needs you tray
The Nest SHALL show, above the cards, every pending ask and approval across the space's
Nurlings, and SHALL render nothing when there are none. Secret requests SHALL show who is asking
but not the request's content, and SHALL be answered only in the thread.

#### Scenario: Pending approval
- **WHEN** a Nurling's run waits on an approval
- **THEN** the tray lists it with the Nurling and the question, and the item opens the thread

#### Scenario: Secret request
- **WHEN** a Nurling asks for a password
- **THEN** the tray item does not include the request's text and offers no inline answer

#### Scenario: Answer in place
- **WHEN** an ask carries explicit actions and the user chooses one in the tray
- **THEN** the answer is sent through the existing answer endpoint and the item leaves the tray

### Requirement: Routines timeline for today
The Nest SHALL show, for the user's local day, the routine runs that already happened with their
outcome and the remaining scheduled occurrences, across all Nurlings.

#### Scenario: Ran and next
- **WHEN** a routine ran at 09:00 and is scheduled again at 14:00
- **THEN** the timeline shows both, ordered by time, with the first marked with its outcome

### Requirement: Today's stats use existing data only
Per-Nurling stats SHALL be limited to runs completed, runs failed (when any), routine runs and
tokens used, for the user's local day.

#### Scenario: Missing token data
- **WHEN** some usage rows have no token total
- **THEN** the tokens figure sums the rows that have one and does not error

### Requirement: Live and cheap
The Nest SHALL refresh from a single snapshot request about every three seconds while the page is
visible, and SHALL NOT poll while hidden.

#### Scenario: Hidden tab
- **WHEN** the browser tab is hidden
- **THEN** no snapshot requests are made until it is visible again
