## ADDED Requirements

### Requirement: An avatar shows one of eight states
A Nurling's organic avatar SHALL show exactly one of: idle, thinking, working, needs you, in
review, blocked, done, asleep. The state SHALL be derived in one shared function from the run
status, composing, ticket status and an optional asleep flag, with no new status values. Needs you
SHALL win over working, and a background run SHALL NOT drive a chat avatar.

#### Scenario: Waiting on the user
- **WHEN** the Nurling's run is waiting for input or a takeover
- **THEN** its avatar shows needs you with the warning pip

#### Scenario: A failed run
- **WHEN** the Nurling's run has failed
- **THEN** its avatar shows blocked with the destructive pip

#### Scenario: A finished run settles
- **WHEN** a run completes
- **THEN** the avatar shows done with the success pip for 4 seconds, then idle

#### Scenario: A background run
- **WHEN** only a ticket run is active
- **THEN** the chat avatar stays idle

### Requirement: A working avatar shows its tool
A working avatar SHALL show a pencil on a notepad for write, a magnifier for search, a laptop for
computer, and an orbiting dot when no tool is running or the tool is unknown. It SHALL show a
progress ring only when a real progress value is known and ripples while a run is queued. After 3
minutes of continuous work it SHALL show the long-run look.

#### Scenario: Searching
- **WHEN** the Nurling's current tool maps to search
- **THEN** its avatar shows the magnifier

#### Scenario: Unknown tool
- **WHEN** the current tool is not in the map
- **THEN** its avatar shows the orbiting dot

#### Scenario: Long run
- **WHEN** a Nurling has worked continuously for 3 minutes
- **THEN** its avatar breathes slower, its eyes look tired and one sweat drop shows

### Requirement: Switching tools is animated
When the working tool changes, the avatar SHALL drop the old prop in 240 ms, blink, and pop the new
prop in over about 500 ms with a ring burst, and its eyes SHALL then follow the new prop. A change
during a swap SHALL replace the pending prop.

#### Scenario: From write to computer
- **WHEN** the tool changes from write to computer
- **THEN** the notepad drops, the eyes blink and the laptop pops in

### Requirement: The backend names the tool category
The worker SHALL put a `tool` category (write, search or computer) on each tool-called event from
one provider-neutral map of built-in tool names, and SHALL omit it for any other tool. Clients SHALL
render the category they receive and SHALL NOT map tool names themselves.

#### Scenario: A document tool
- **WHEN** the Nurling calls `write_file`
- **THEN** the tool-called event carries the write category

#### Scenario: An integration tool
- **WHEN** the Nurling calls a tool that is not in the map
- **THEN** the event carries no category and the avatar shows the orbiting dot

### Requirement: Avatars follow the pointer and get dizzy
On web, avatar eyes SHALL follow the pointer and the body SHALL follow at about a third of that
distance, with no following while thinking or asleep. Six direction changes within 900 ms SHALL make
every visible avatar dizzy for about 2.4 seconds, except sleeping and thinking ones. Pointer
tracking SHALL use one shared listener and SHALL NOT rerender avatars on pointer moves.

#### Scenario: Shaking the pointer
- **WHEN** the pointer changes direction six times within 900 ms
- **THEN** every visible avatar except asleep and thinking shows spiral eyes and orbiting stars for
  about 2.4 seconds

### Requirement: Small avatars and reduced motion stay still
An avatar 24px or smaller, or any avatar under reduced motion, SHALL show no props, no following and
no animation; only its pip SHALL tell the state.

#### Scenario: A 24px avatar needs you
- **WHEN** a 24px avatar's Nurling needs the user
- **THEN** the avatar is still and shows the warning pip

### Requirement: Avatars are named with their state
An avatar SHALL have an accessible name that includes its state, such as "Chief, working", and SHALL
add no visible text.

#### Scenario: Name
- **WHEN** Chief's avatar shows working
- **THEN** its accessible name is "Chief, working"
