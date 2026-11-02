## MODIFIED Requirements

### Requirement: Updaters that could fetch an upstream build are disabled
The desktop auto-updater and mobile over-the-air updates SHALL be disabled so that a Nurlings
build cannot be replaced by an upstream one. They are disabled, not re-pointed. The server has no
self-update path: upstream removed it, and the server SHALL NOT gain one that contacts an upstream
repository or image.

#### Scenario: Desktop update check
- **WHEN** a packaged desktop app starts with default settings
- **THEN** no update check is made, the updater is not initialised, and the effective builder configuration contains no upstream update feed

#### Scenario: Mobile OTA
- **WHEN** the Expo configuration is resolved
- **THEN** updates are disabled and no update URL is present

#### Scenario: Server self-update refused
- **WHEN** an owner or client looks for a way to check for or apply a server update
- **THEN** the API offers none: it has no such route, environment variable or updater sidecar address, and contacts no upstream repository

#### Scenario: Software-update section hidden
- **WHEN** the web app's settings are opened on a server
- **THEN** no software-update section is shown
