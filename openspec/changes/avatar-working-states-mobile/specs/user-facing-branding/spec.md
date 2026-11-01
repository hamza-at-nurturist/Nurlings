## ADDED Requirements

### Requirement: Mobile avatars show the same eight states
On mobile, a Nurling's organic avatar SHALL show the same state, working look and tool prop as on
web, taken from the shared state functions and the tool category on the tool-called event. Mobile
SHALL NOT map tool names or states itself. The body SHALL keep the Nurling's own color and the pips
SHALL use only the warning, destructive and success colors. The logo set and photo avatars SHALL be
unchanged.

#### Scenario: Waiting on the user
- **WHEN** a Nurling's run is waiting for input on mobile
- **THEN** its avatar shows needs you with the warning pip

#### Scenario: Computer prop
- **WHEN** the current tool category is computer
- **THEN** the avatar shows a laptop whose screen faces the Nurling

#### Scenario: Unknown tool
- **WHEN** the event carries no tool category
- **THEN** the avatar shows the orbiting dot

### Requirement: Mobile avatars have a calm gaze
Mobile avatars SHALL NOT follow touches and SHALL NOT become dizzy. Their eyes SHALL keep the idle
drift and blink, and settle on the prop while a tool is shown.

#### Scenario: Touching near an avatar
- **WHEN** the user touches the screen near an avatar
- **THEN** the avatar's gaze does not change

### Requirement: Mobile tool swap is animated
When the working tool changes, a mobile avatar SHALL drop the old prop in 240 ms, blink, and pop the
new prop in over about 500 ms with a ring burst. A change during a swap SHALL replace the pending
prop.

#### Scenario: From search to write
- **WHEN** the tool changes from search to write
- **THEN** the magnifier drops, the eyes blink and the notepad pops in

### Requirement: Small mobile avatars and Reduce Motion stay still
A mobile avatar of 24 pt or smaller, or any avatar while Reduce Motion is on, SHALL show no props and
no animation; only its pip SHALL tell the state.

#### Scenario: 20 pt avatar blocked
- **WHEN** a 20 pt avatar's Nurling is blocked
- **THEN** the avatar is still and shows the destructive pip

### Requirement: Mobile avatars are named with their state
A named mobile avatar SHALL have an accessible name that includes its state, such as "Chief,
working", except idle, where the name is the Nurling's name alone. It SHALL add no visible text.

#### Scenario: Name
- **WHEN** Chief's avatar shows working on mobile
- **THEN** its accessible name is "Chief, working"

#### Scenario: Idle
- **WHEN** a named avatar is idle
- **THEN** its accessible name is the Nurling's name only
