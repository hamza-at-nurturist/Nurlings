## MODIFIED Requirements

### Requirement: Avatars follow the pointer and get dizzy

On web, avatar eyes SHALL follow the pointer only while the pointer is within a radius of the
avatar of about 2.5 times its size, never less than 120px. The pull SHALL be strongest at the
avatar's edge and ease smoothly to zero at the radius; beyond it the avatar SHALL show its idle
gaze. There SHALL be no following while thinking or asleep. Ten direction changes within 1.5
seconds, each move at least 16px, SHALL make every visible avatar dizzy for about 2.4 seconds,
except sleeping and thinking ones. Pointer tracking SHALL use one shared listener and SHALL NOT
rerender avatars on pointer moves.

#### Scenario: Cursor far away

- **WHEN** the pointer is farther from an avatar than its follow radius
- **THEN** the avatar shows its idle gaze

#### Scenario: Cursor near

- **WHEN** the pointer is just outside the avatar's edge
- **THEN** the avatar looks toward it with its full state strength, easing off as the pointer moves
  away

#### Scenario: A quick wiggle

- **WHEN** the pointer changes direction six times within 900 ms
- **THEN** no avatar becomes dizzy

#### Scenario: Shaking the pointer

- **WHEN** the pointer changes direction ten times within 1.5 seconds, each move at least 16px
- **THEN** every visible avatar except asleep and thinking shows spiral eyes and orbiting stars for
  about 2.4 seconds

### Requirement: The avatar picker offers organic bodies only

The avatar pickers on web, desktop and mobile SHALL list organic bodies only: the bot's default
body, the brand blob, three additional original bodies stored as `#hex::shape_9` to
`#hex::shape_11`, and each of the ten hashed organic families, stored as `#hex::shape_12` to
`#hex::shape_21`. They SHALL NOT list the static shapes `shape_0` to `shape_7`, and no body SHALL
reproduce another product's avatar. The 14 bodies SHALL wrap cleanly on web and mobile.

#### Scenario: Picker contents

- **WHEN** a person opens the Avatar Studio, the create-bot dialog or the mobile bot settings shape list
- **THEN** the Default chip and 14 organic bodies are listed and none of the eight static shapes appears

#### Scenario: Picking a family

- **WHEN** a person picks one of the ten organic families
- **THEN** the bot stores `#hex::shape_{12 + family}` and draws that family's body whatever its id

#### Scenario: New bot balance

- **WHEN** a new bot is created without a chosen look
- **THEN** it gets the least-used hashed organic look and colour among the person's bots

### Requirement: Existing avatar values keep their look

Stored `#hex::shape_N` values SHALL keep parsing with no data change, and the additional bodies
SHALL be appended after the existing indexes so no existing bot's body changes.

#### Scenario: Existing static-shape bot

- **WHEN** a bot already stores `#hex::shape_3`
- **THEN** it renders as an organic avatar in that colour with its own hashed body, and keeps working
  without migration

#### Scenario: Existing organic bots unchanged

- **WHEN** a bot stores a plain `#hex` colour
- **THEN** its organic body is the same family as before this change

## ADDED Requirements

### Requirement: Chief's face and highlight sit inside its body

Chief SHALL draw its eyes at the storyboard position, lean and scale, and its gloss arc SHALL be its
own stored arc. On an ink-colored Chief the eye glint SHALL be ink and the gloss SHALL use the page
background at low opacity. Every body's gloss arc SHALL lie inside its outline.

#### Scenario: Gloss containment

- **WHEN** the gloss arc of any body is sampled
- **THEN** every point lies inside that body's outline
