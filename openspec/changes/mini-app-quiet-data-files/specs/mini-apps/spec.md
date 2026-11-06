## ADDED Requirements

### Requirement: A bot can attach a file without posting it in the chat

`attach_file` SHALL accept a `quiet` flag. A quiet attach SHALL store the file, including as a new
version of an artifact of the same name, and SHALL NOT post a message in the chat. Without the flag
the file SHALL be posted as before.

#### Scenario: Refreshing a mini app's data

- **WHEN** a bot attaches a data file again with `quiet` set
- **THEN** the app reads the new version and the chat gains no message

#### Scenario: Attaching for the person to see

- **WHEN** a bot attaches a file without `quiet`
- **THEN** the file's card appears in the chat
