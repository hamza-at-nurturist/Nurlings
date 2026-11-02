## ADDED Requirements

### Requirement: A mini app can have several screens with a sidebar

A mini app file MAY set its layout to edge to edge, use a grid with a sidebar column, and hold
several screens. A button SHALL be able to set a value under `/ui` in the app's own state, and each
screen SHALL show only while that value says so. A button SHALL NOT be able to set a value outside
`/ui`.

#### Scenario: Switching screens

- **WHEN** a person chooses a sidebar item whose button sets the page value
- **THEN** only that screen is shown and the chosen item is highlighted

#### Scenario: Writing outside the interface state

- **WHEN** an app file has a button that sets a value outside `/ui`
- **THEN** the file is refused whole

### Requirement: Mini app tables show rich cells and can be filtered

A table column SHALL be able to show its cells stacked over a second line, as a tag, as a segmented
meter, as a thumb rating or as a row menu icon, and a cell's tone SHALL be able to come from its row's
data. A table SHALL be able to keep only the rows whose field includes a chosen value, and only the
rows where typed text appears in some chosen fields.

#### Scenario: Tabs filter the rows

- **WHEN** a table keeps rows by a bucket and a person chooses a tab for another bucket
- **THEN** only the rows in that bucket are shown

#### Scenario: Typing filters the rows

- **WHEN** a person types text that appears in one row's name
- **THEN** only that row is shown

### Requirement: Mini apps can show a conversation and a change

A mini app SHALL be able to draw chat messages from a contact and from an agent, with an optional
decision card of tags, a reason, a footer and a thumb, a dashed message for one that was skipped, and
a quiet line for a note. It SHALL be able to draw a before and after text with removed words struck
out and added words highlighted.

#### Scenario: A decision card

- **WHEN** an agent message has a decision with tags and a thumb
- **THEN** a card with those tags and the thumb is drawn under the message

### Requirement: Mini apps can use form controls bound to their own state

A mini app SHALL be able to draw a text field, a text area, a select and a row of toggle chips whose
values are bound to paths under `/ui`, so that other parts of the app react to them. Nothing a person
types SHALL be sent anywhere.

#### Scenario: Choosing one chip

- **WHEN** a single-choice toggle row has one chip chosen and a person chooses another
- **THEN** the first is no longer chosen and the second is

### Requirement: Mini apps name icons only from a fixed list

A mini app SHALL be able to draw an icon only by a name from a fixed list; a name outside it SHALL
refuse the whole file.

#### Scenario: An unknown icon

- **WHEN** an app file asks for an icon that is not in the list
- **THEN** nothing is drawn and the short refusal message is shown
