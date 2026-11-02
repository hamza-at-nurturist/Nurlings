## ADDED Requirements

### Requirement: Bots can save mini apps that the web app draws

The web app SHALL draw an artifact named `<name>.app.json` as a mini app: a screen built only from
the app's own components, described by a json-render spec in the file. The app SHALL refuse a
file that is not valid JSON, is larger than 200 KB, or uses a component or prop outside its
catalog, and SHALL show one short message in place of the screen.

#### Scenario: Drawing a valid app

- **WHEN** a person opens an app file whose spec uses only catalog components
- **THEN** the app draws the screen with the app's own look in light and dark

#### Scenario: Refusing an unknown component

- **WHEN** an app file uses a component that is not in the catalog
- **THEN** nothing from the spec is drawn and a short message says the app cannot be shown

### Requirement: Mini apps show live data from the bot's JSON artifacts

A mini app SHALL read the JSON artifacts named in its file, made by the same bot, with the
person's own session, and SHALL read them again every 10 seconds while it is open. The app file
SHALL NOT receive credentials or network access.

#### Scenario: Data updates

- **WHEN** the bot saves a new version of a data file an open app reads
- **THEN** the app shows the new values within about 10 seconds without being reopened

#### Scenario: Data is missing

- **WHEN** a named data file does not exist or cannot be read
- **THEN** the app draws with that data empty and does not fail

### Requirement: A mini app button asks its bot

A button in a mini app SHALL be able to run the action `askBot` with a message. The action SHALL
put the message in that bot's chat composer and open the chat, and SHALL NOT send it.

#### Scenario: Asking the bot

- **WHEN** a person presses a button whose action is `askBot` with a message
- **THEN** the bot's chat opens with the message in the composer and nothing has been sent
