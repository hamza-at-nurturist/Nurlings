## ADDED Requirements

### Requirement: Instructions can be edited at full size

The web app SHALL let a person open a bot's instructions in a large editor from the bot settings
panel, editing the same text the panel shows.

#### Scenario: Expanding the editor

- **WHEN** a person chooses the expand button next to Instructions in a bot's settings
- **THEN** a large editor opens over the page with the current instructions

#### Scenario: Saving from the large editor

- **WHEN** a person edits the text in the large editor and closes it
- **THEN** the instructions are saved once and the panel shows the new text
