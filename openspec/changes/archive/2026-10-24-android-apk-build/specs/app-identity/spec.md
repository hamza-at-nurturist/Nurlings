## ADDED Requirements

### Requirement: Nurlings Expo account and project
The mobile configuration SHALL NOT name the upstream Expo owner or EAS project. `owner` and the EAS
project id SHALL be the Nurlings Expo account (`nurturist-ai`) and project, and a release build
SHALL fail if either is ever a `REPLACE_WITH_…` placeholder.

#### Scenario: Nurlings Expo project configured
- **WHEN** `app.json` is read
- **THEN** `owner` is `nurturist-ai`, `extra.eas.projectId` is the Nurlings EAS project id, no `REPLACE_WITH_…` placeholder remains, and no upstream owner, project id or update URL appears

#### Scenario: Release build blocked
- **WHEN** a production EAS build profile resolves a configuration in which a placeholder is set
- **THEN** resolution throws an error naming the placeholder

## REMOVED Requirements

### Requirement: Expo ownership placeholders
**Reason**: The Nurlings Expo account and project exist, so the placeholders are replaced by the real values.
**Migration**: Replaced by "Nurlings Expo account and project", which keeps the release-build guard.
