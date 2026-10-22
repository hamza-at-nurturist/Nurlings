## ADDED Requirements

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

### Requirement: Native identifiers unchanged
The change SHALL NOT alter the iOS bundle identifier, the Android package, the `rakazo://` URL
scheme, the Expo slug, the desktop application id or the Linux executable name, so no server-side
configuration needs to change.

#### Scenario: Identifiers preserved
- **WHEN** the resolved Expo config and desktop builder config are compared with upstream's
- **THEN** bundle identifier, package, scheme, slug, desktop application id and executable name are identical

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
