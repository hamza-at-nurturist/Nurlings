## ADDED Requirements

### Requirement: Attached mini apps keep their app suffix

A file attached from a `.app.json` path SHALL be stored with a name ending in `.app.json`, even when the bot supplies a name without it, so it opens as an app and is checked as one.

#### Scenario: Friendly name without the suffix

- **WHEN** a bot attaches `crm.app.json` with the name `Demo CRM`
- **THEN** the stored name is `Demo CRM.app.json` and the file is validated as a mini app
