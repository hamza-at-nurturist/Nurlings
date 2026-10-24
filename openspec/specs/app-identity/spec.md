# app-identity Specification

## Purpose
Defines how the web, desktop and mobile apps identify themselves as Nurlings, including the mobile bundle identifier, the placeholders left for store and Expo accounts, and where the placeholder artwork lives.

## Requirements

### Requirement: Desktop app display identity
The Electron desktop app SHALL present itself as Nurlings: product name, window title, menus,
dock/taskbar name, installer and artifact names, About panel and macOS microphone prompt. Its
icons SHALL be the Nurlings icons. Upstream has no system tray, and none is added.

#### Scenario: Packaged app
- **WHEN** the desktop app is packaged
- **THEN** the artifact is named "Nurlings" (for example `Nurlings.app`), the microphone permission text names Nurlings, and the icon is the Nurlings icon

#### Scenario: Window title
- **WHEN** the desktop app shows the web UI
- **THEN** the window title is "Nurlings"

### Requirement: Mobile app display identity
The Expo mobile app SHALL present itself as Nurlings: the app display name on the home screen and
in system settings, permission descriptions, launcher and notification icons, and splash screen.

#### Scenario: Resolved Expo config
- **WHEN** the Expo configuration is resolved
- **THEN** the display name is "Nurlings", every permission description names Nurlings, and icons and splash point at the Nurlings assets

### Requirement: Mobile bundle identifier
The iOS bundle identifier and the Android package SHALL both be `com.nurturistai.nurlings`, taken
from the brand configuration. The Expo slug SHALL be `nurlings`, matching the Nurlings Expo
project. The `rakazo://` URL scheme, the desktop application id and the Linux executable name
SHALL NOT change.

#### Scenario: Resolved Expo config
- **WHEN** the Expo configuration is resolved
- **THEN** `ios.bundleIdentifier` and `android.package` are `com.nurturistai.nurlings`, `slug` is `nurlings` and `scheme` is `rakazo`

#### Scenario: Other identifiers preserved
- **WHEN** the desktop builder `appId` and the Linux `executableName` are compared with upstream's
- **THEN** they are identical

### Requirement: Minimal server support for the bundle identifier
The server SHALL advertise the configured Android package in its Android passkey association file
and SHALL leave its trusted mobile origins unchanged; iOS passkey association SHALL continue to
come from the `PASSKEY_APPLE_APP_IDS` setting.

#### Scenario: Android association
- **WHEN** Android passkey fingerprints are configured and `/.well-known/assetlinks.json` is requested
- **THEN** its `package_name` is `com.nurturistai.nurlings`

#### Scenario: Origins unchanged
- **WHEN** a sign-in redirect uses the `rakazo://` scheme
- **THEN** it is accepted exactly as before, and no origin derived from the bundle identifier is added

### Requirement: Web identity
The web app SHALL show the configured product name in the document title, the
`apple-mobile-web-app-title` meta tag and the web app manifest `name` and `short_name`, and SHALL
reference favicon and touch-icon files produced from the Nurlings assets.

#### Scenario: Built web app
- **WHEN** the web app is built
- **THEN** `index.html` has title "Nurlings" and the manifest has name and short name "Nurlings"

#### Scenario: Wordmark
- **WHEN** the sign-in screen or sidebar shows the logo
- **THEN** it shows the Nurlings wordmark and not the upstream wordmark or mascot

### Requirement: Placeholder assets in one folder
Logo, app-icon, favicon, splash and notification sources SHALL exist as clearly named placeholder
files in a single assets folder, with a documented table of every size each platform needs and a
command that regenerates the per-platform files. Placeholders SHALL NOT contain the upstream logo
or mascot.

#### Scenario: Drop-in replacement
- **WHEN** a designer replaces the source files in the assets folder and runs the export command
- **THEN** all web, desktop and mobile icon, favicon, splash and notification files are regenerated at the documented sizes with no code changes

#### Scenario: Required sizes documented
- **WHEN** the assets README is read
- **THEN** it lists the sizes for macOS, Windows, Linux, iOS, Android (launcher, adaptive, monochrome, notification), splash, and web favicons and touch icons

#### Scenario: Marketing site untouched
- **WHEN** the asset export command runs
- **THEN** it writes no files under the marketing site

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
