## ADDED Requirements

### Requirement: A mini app can be written as a nested tree

A mini app spec MAY give `root` as an element whose `children` are elements written inside it. Such a
file SHALL draw the same as the equivalent flat file, and a flat file SHALL keep working. A nested
file with an element that has no type, or children that are not a list, SHALL be refused with the
position of the mistake.

#### Scenario: Nested and flat draw the same

- **WHEN** an app file writes its elements as a nested tree
- **THEN** the app draws the same screen as the flat file with the same elements

#### Scenario: A mistake in the tree

- **WHEN** an element in the tree has no type
- **THEN** the file is refused and the reason names where in the tree it is

### Requirement: A bot is told when its mini app file is wrong

When a bot attaches a mini app file the app could not draw, the attach SHALL fail and its result SHALL
say what is wrong. When a bot writes such a file into its workspace, the write SHALL succeed and its
result SHALL say what is wrong. Files that are not mini apps SHALL NOT be checked.

#### Scenario: Attaching a broken app

- **WHEN** a bot attaches `x.app.json` that uses a prop outside the catalog
- **THEN** nothing is attached and the result names the component and the prop

#### Scenario: Attaching another JSON file

- **WHEN** a bot attaches `report.json`
- **THEN** it is attached without a mini app check

### Requirement: Bots can start from a template

The built-in skills SHALL include a multi-screen mini app template that the app accepts, and a test
SHALL check every mini app example in a built-in skill against the same validator the app uses.

#### Scenario: Skill examples stay valid

- **WHEN** a catalog change makes a skill example invalid
- **THEN** the test suite fails
