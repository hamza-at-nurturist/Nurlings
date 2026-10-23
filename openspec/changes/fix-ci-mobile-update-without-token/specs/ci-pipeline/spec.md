## ADDED Requirements

### Requirement: Mobile updates are skipped, not failed, without an Expo token
The job that publishes a compatible mobile update from `main` SHALL succeed with a notice when the
`EXPO_TOKEN` secret is not set, and SHALL NOT run any step that needs Expo in that case. When the
secret is set, it SHALL publish as before.

#### Scenario: No token
- **WHEN** a merge to `main` changes mobile-safe code and `EXPO_TOKEN` is not set
- **THEN** the job ends green with a notice, no Expo step runs, and the `ci` run does not fail

#### Scenario: Token set
- **WHEN** a merge to `main` changes mobile-safe code and `EXPO_TOKEN` is set
- **THEN** the job installs, verifies and publishes the update as before
