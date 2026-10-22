## ADDED Requirements

### Requirement: Visible links point to Nurlings
Every link the web, desktop and mobile UIs show to the product's website, documentation or
privacy information SHALL target the configured Nurlings site (https://nurlings.nurturistai.com)
and SHALL NOT target the upstream website or repository.

#### Scenario: Sidebar and consent links
- **WHEN** the web app's sidebar Docs link and the AI-privacy link are followed
- **THEN** both go to https://nurlings.nurturistai.com

### Requirement: Rakazo-hosted entries removed
The UIs SHALL NOT offer the upstream hosted cloud, the upstream App Store listing, the upstream
Android download, a Discord invite or a waitlist link, and SHALL NOT add a replacement community
link.

#### Scenario: Desktop setup has no hosted option
- **WHEN** the desktop first-run setup is shown
- **THEN** it does not offer to sign in to a hosted cloud, and its default choice is a local or self-hosted server

#### Scenario: Previously saved hosted choice
- **WHEN** a desktop profile has a saved setup that selected the upstream hosted cloud
- **THEN** the app shows the setup screen again instead of connecting to the upstream origin

#### Scenario: No store links
- **WHEN** the store URLs are unset
- **THEN** the web sidebar has no "Get the mobile app" entry and the mobile force-update prompt opens no upstream store page

### Requirement: Updaters that could fetch an upstream build are disabled
The desktop auto-updater, mobile over-the-air updates and the server self-update SHALL be disabled
so that a Nurlings build or client server cannot be replaced by an upstream one. They are disabled,
not re-pointed.

#### Scenario: Desktop update check
- **WHEN** a packaged desktop app starts with default settings
- **THEN** no update check is made, the updater is not initialised, and the effective builder configuration contains no upstream update feed

#### Scenario: Mobile OTA
- **WHEN** the Expo configuration is resolved
- **THEN** updates are disabled and no update URL is present

#### Scenario: Server self-update refused
- **WHEN** an owner requests a server update check or apply
- **THEN** the server answers that self-update is switched off for this deployment and contacts neither the updater sidecar nor any upstream repository

#### Scenario: Software-update section hidden
- **WHEN** the web app's settings are opened on a server with self-update disabled
- **THEN** no software-update section is shown
