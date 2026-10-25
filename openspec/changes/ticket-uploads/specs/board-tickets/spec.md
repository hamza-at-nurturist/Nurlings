## ADDED Requirements

### Requirement: Attach files to a ticket
In the ticket modal, the user SHALL be able to attach files with the reply box's attach control or
by dropping them on the modal, with chat's accepted types and limits. Files SHALL upload when the
reply is sent, through the same upload path chat uses, and the comment SHALL carry them; a comment
MAY have files and no text. Only files of the same space, user and owning Nurling SHALL be accepted.

#### Scenario: Attach in the reply box
- **WHEN** the user picks a file with the attach control and sends
- **THEN** the comment shows the file and the Files list shows it labelled "You"

#### Scenario: Drop on the modal
- **WHEN** the user drops a file on the modal
- **THEN** it is staged in the reply box and nothing uploads until they send

#### Scenario: Foreign file
- **WHEN** a comment names a file of another user or Nurling
- **THEN** the comment is refused

### Requirement: Nurlings can read a ticket's files
`ticket_get` SHALL list the ticket's files, both the user's and the Nurlings', with name, type, size,
who added it, and a path. When the Nurling next uses a file tool in that run, the files SHALL be copied
to those paths by the same mechanism as chat attachments.

#### Scenario: Owner reads an upload
- **WHEN** the owner is woken by a reply carrying a file and calls `ticket_get`
- **THEN** the file is listed with its path, and reading that path with a file tool returns its contents

#### Scenario: Mentioned Nurling
- **WHEN** a Nurling woken by a mention calls `ticket_get`
- **THEN** it sees and can read the same files
