## MODIFIED Requirements

### Requirement: The brand blob is an avatar shape

The brand mark's blob and its two slanted pill eyes SHALL be one of the organic avatar bodies,
drawn through the same code, with the same colour picker, animations and sizes as every other
organic body, on the web, desktop and mobile apps. It SHALL be offered in the create-bot picker
and the Avatar Studio, and its stored value SHALL be an ordinary `#hex::shape_8` value with no
reserved or special-cased avatar value.

#### Scenario: Picked like any other shape

- **WHEN** a person opens the create-bot picker or the Avatar Studio
- **THEN** the brand blob is listed with the other organic bodies and, once picked, takes the chosen colour

#### Scenario: Behaves like any other shape

- **WHEN** a bot using the brand blob is idle or working
- **THEN** it shows the organic working state and its eyes blink and look around with the same animation as any organic body

#### Scenario: Visual weight

- **WHEN** the brand blob is shown at the same size as another organic body
- **THEN** it is drawn large enough to read at the same weight without extending past the organic box

## ADDED Requirements

### Requirement: The avatar picker offers organic bodies only

The avatar pickers on web, desktop and mobile SHALL list organic bodies only: the bot's default
body, the brand blob, and three additional original bodies stored as `#hex::shape_9` to
`#hex::shape_11`. They SHALL NOT list the static shapes `shape_0` to `shape_7`, and no body SHALL
reproduce another product's avatar.

#### Scenario: Picker contents

- **WHEN** a person opens the Avatar Studio or the mobile bot settings shape list
- **THEN** only organic bodies are listed and none of the eight static shapes appears

#### Scenario: New bot balance

- **WHEN** a new bot is created without a chosen look
- **THEN** it gets the least-used hashed organic look and colour among the person's bots

### Requirement: Existing avatar values keep their look

Stored `#hex::shape_N` values SHALL keep parsing with no data change, and the additional bodies
SHALL be appended after the ten hashed organic families so no existing bot's body changes.

#### Scenario: Existing static-shape bot

- **WHEN** a bot already stores `#hex::shape_3`
- **THEN** it renders as an organic avatar in that colour and keeps working without migration

#### Scenario: Existing organic bots unchanged

- **WHEN** a bot stores a plain `#hex` colour
- **THEN** its organic body is the same family as before this change
