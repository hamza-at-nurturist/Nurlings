## ADDED Requirements

### Requirement: Notes saved during a ticket run carry the ticket ref

When a Nurling saves a note with `remember`, or with `save_memory` on a connected memory provider,
during a run that is working a ticket, the system SHALL prefix the note with the ticket ref in
square brackets. The ref SHALL come from the run's task, never from the model. Runs that are not
working a ticket, and shared memory saves, SHALL be left unchanged.

#### Scenario: Owner saves a note on its ticket

- **WHEN** the owner's ticket run calls `remember` with "Client wants invoices as PDF" on NUR-12
- **THEN** the stored note is "[NUR-12] Client wants invoices as PDF"

#### Scenario: Mentioned Nurling saves a note

- **WHEN** a mentioned Nurling's comment-only run calls `remember` on NUR-12
- **THEN** its note is prefixed "[NUR-12]"

#### Scenario: Saving outside a ticket run

- **WHEN** a Nurling calls `remember` in an ordinary chat run
- **THEN** the note is stored exactly as given
