# the-nest Specification

## Purpose
Defines The Nest, the screen that shows every Nurling at a glance: a card per Nurling with its avatar, a mood badge, its current task and its next routine, plus a read-only tray of what needs the user. The server decides each mood from run and routine state, and the page is built from independent sections fed by one polled snapshot.

## Requirements

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
The server SHALL return one mood per Nurling: needs you when its latest run is `waiting_input` or
`waiting_takeover`; otherwise error when its latest run failed; otherwise working when a run is
`queued`, `leased` or `running`; otherwise sleeping when it has no armed routine and no run in
the last 24 hours; otherwise idle. Clients SHALL render the returned mood and SHALL NOT derive it.

#### Scenario: Waiting beats failure
- **WHEN** a Nurling is waiting on the user and also has an earlier failed run
- **THEN** its mood is needs you

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
The Nest SHALL show, above the cards, every pending ask across the space's Nurlings, SHALL render
nothing when there are none, and SHALL only open the Nurling's thread; it SHALL NOT answer. Secret
requests SHALL show who is asking but not the request's content.

#### Scenario: Pending ask
- **WHEN** a Nurling's run waits on an ask
- **THEN** the tray lists it with the Nurling and the question, and its Open button goes to the
  thread

#### Scenario: Secret request
- **WHEN** a Nurling asks for a password
- **THEN** the tray item does not include the request's text

#### Scenario: Group thread
- **WHEN** the ask was made in a group thread
- **THEN** Open goes to the group's thread

### Requirement: Sections are independent
The snapshot SHALL be an object of named sections and the page SHALL render each section from its
own component, so adding a section does not change the existing ones.

#### Scenario: Unknown section
- **WHEN** a snapshot carries a key the client does not know
- **THEN** the known sections still render

### Requirement: Cheap and visible-only polling
The Nest SHALL refresh from a single snapshot request about every three seconds while the page is
visible, and SHALL NOT request while the tab is hidden.

#### Scenario: Hidden tab
- **WHEN** the browser tab is hidden
- **THEN** no snapshot requests are made until it is visible again
