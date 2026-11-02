## ADDED Requirements

### Requirement: Mini apps can draw charts, notes, progress, facts and tabs

Besides its basic components, a mini app SHALL be able to draw a bar, line, area or pie chart (several series for all but pie), a highlighted
note, a progress bar, a list of facts and tab buttons that show and hide parts of the screen.

#### Scenario: A chart of values below zero

- **WHEN** a bar chart has values above and below zero
- **THEN** bars below zero draw in the destructive color on a zero line with a value axis, and the
  chart has an accessible name that names its first and last points

#### Scenario: Comparing series

- **WHEN** a line or area chart lists several value keys
- **THEN** each key draws as its own series, with a legend, and a pie chart draws one slice per row
  with a legend in the order of the data

#### Scenario: Tabs

- **WHEN** a person chooses another tab of a mini app that shows each tab's content under a visible
  condition on the tab's value
- **THEN** only that tab's content is shown

#### Scenario: A component used wrongly

- **WHEN** an app file gives a chart an unknown type or a table column an unknown format
- **THEN** the file is refused whole, as for any value outside the catalog

### Requirement: Mini app values show as numbers, money and status

Stat tiles, key facts and table columns SHALL be able to show a value as a number, currency or
percent, and tones SHALL be limited to neutral, success, warning and destructive. Formatted table
columns SHALL right-align their numbers and draw negative values in the destructive color. A table
column MAY instead draw its cells as status badges colored by a map from cell text to tone.

#### Scenario: Status badges

- **WHEN** a table column is formatted as badge and its tones map says a cell's text is destructive
- **THEN** the cell shows that text as a destructive badge

#### Scenario: Money

- **WHEN** a value is formatted as currency and is negative
- **THEN** it shows with the currency symbol, in the person's locale, in the destructive color in a
  table

### Requirement: Mini apps preview in chat

A mini app attached in a chat SHALL show the same preview card as an HTML file and open in the
preview dialog, drawn like in the Artifacts screen. A JSON file that is not a mini app SHALL stay a
plain download.

#### Scenario: Opening from chat

- **WHEN** a person chooses the preview card of an attached `<name>.app.json`
- **THEN** the preview dialog opens with the app drawn

#### Scenario: Plain JSON

- **WHEN** a chat attaches a JSON file whose name does not end in `.app.json`
- **THEN** it shows as a downloadable file with no preview

### Requirement: Mini app buttons reach the composer from the chat preview

When a person presses an `askBot` button in a mini app opened from a chat, the app SHALL put the
message in that chat's composer, replacing its text, and close the preview. It SHALL NOT send it.

#### Scenario: Asking from the chat preview

- **WHEN** a person presses an askBot button in a mini app opened from a bot's chat
- **THEN** the preview closes and the bot's composer holds the message, unsent
