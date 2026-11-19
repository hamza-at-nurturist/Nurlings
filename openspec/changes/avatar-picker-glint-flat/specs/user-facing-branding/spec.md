## ADDED Requirements

### Requirement: A bot's avatar is glint or flat

Every bot SHALL have an avatar finish, glint or flat. Glint draws the eye catchlights and the gloss
arc and is the default. Flat draws the body and eyes only. The finish SHALL apply to every organic
body in every colour and SHALL NOT change the body, colour, state, props or motion. The picker
SHALL offer the two finishes as preview tiles with accessible names and no visible text.

#### Scenario: Picking flat on web

- **WHEN** a person opens the Avatar Studio, chooses the flat tile and closes it
- **THEN** the bot's avatar draws no catchlights or gloss everywhere it appears, and still does
  after a reload

#### Scenario: Picking a finish when creating a bot

- **WHEN** a person chooses flat in the create-bot dialog
- **THEN** the preview is flat and the created bot is flat

#### Scenario: Picking flat on mobile

- **WHEN** a person chooses the flat tile in the mobile bot look picker
- **THEN** the bot's avatar draws without catchlights or gloss

#### Scenario: Changing shape or colour keeps the finish

- **WHEN** a flat bot gets a different shape or colour
- **THEN** it stays flat

#### Scenario: Accessible names

- **WHEN** a screen reader reaches the two tiles
- **THEN** they are named Glint and Flat and the chosen one is announced as pressed

### Requirement: Existing bots stay glint

A bot with no stored finish SHALL draw glint, so no existing avatar changes. Glint and flat SHALL
NOT be icon sets, and the set tabs SHALL stay hidden while only one set is selectable.

#### Scenario: Bot from before the change

- **WHEN** a bot created before the finish existed is shown
- **THEN** it draws exactly as it did before

#### Scenario: Previous release reads a flat bot

- **WHEN** a client or server from the previous release reads a flat bot
- **THEN** it ignores the finish and draws glint without error

#### Scenario: Set tabs

- **WHEN** a person opens a picker
- **THEN** no icon-set tabs appear and the 14 bodies are listed as before
