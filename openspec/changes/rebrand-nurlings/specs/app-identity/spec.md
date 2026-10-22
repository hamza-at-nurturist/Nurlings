## ADDED Requirements

### Requirement: Desktop app identity
The Electron desktop app SHALL be named Nurlings (product name, window title, menus, executable
and installer names, application id from the brand configuration) and SHALL NOT present the
upstream name in the OS application list, dock/taskbar, About box, permission prompts or setup
window.

#### Scenario: Packaged app
- **WHEN** the desktop app is packaged
- **THEN** the artifact is named "Nurlings" (for example `Nurlings.app`, `Nurlings-<version>.dmg`), its application id is `com.nurturistai.nurlings`, and its microphone permission text names Nurlings

#### Scenario: First-run setup window
- **WHEN** the desktop app starts without a saved server
- **THEN** the setup window title and heading read "Nurlings" and no option refers to the upstream hosted service

### Requirement: Mobile app identity
The Expo mobile app SHALL be named Nurlings with slug `nurlings`, URL scheme `nurlings`, iOS
bundle identifier and Android package `com.nurturistai.nurlings`, and permission descriptions that
name Nurlings. The app SHALL NOT be bound to the upstream Expo owner, EAS project or OTA update
channel; those values SHALL come from deployment configuration and be absent when unset.

#### Scenario: Resolved Expo config
- **WHEN** the Expo configuration is resolved with no owner or project environment variables
- **THEN** name is "Nurlings", slug, scheme, bundle identifier and package match the brand configuration, and `updates.url`, `owner` and `extra.eas.projectId` are absent

#### Scenario: Deep links accepted both ways
- **WHEN** the API receives a sign-in redirect using `nurlings://` or the upstream `rakazo://` scheme
- **THEN** both are accepted as trusted app origins

### Requirement: Web identity
The web app and marketing site SHALL show the configured product name in the document title,
`apple-mobile-web-app-title`, web app manifest `name` and `short_name`, and structured data, and
SHALL reference favicon and touch-icon files produced from the brand assets.

#### Scenario: Built web app
- **WHEN** the web app is built
- **THEN** `index.html` has title "Nurlings" and the manifest has name and short name "Nurlings"

### Requirement: Placeholder assets in one folder
Logo, app-icon, favicon, splash, notification and social-image sources SHALL exist as clearly
named placeholder files in a single assets folder, with a documented table of every size each
platform needs, and a command that regenerates the per-platform files from them. Placeholders
SHALL NOT contain the upstream logo or mascot.

#### Scenario: Drop-in replacement
- **WHEN** a designer replaces the source files in the assets folder and runs the export command
- **THEN** all web, desktop and mobile icon, favicon, splash and social-image files are regenerated at the documented sizes with no code changes

#### Scenario: Required sizes documented
- **WHEN** the assets README is read
- **THEN** it lists the sizes for macOS, Windows, Linux, iOS, Android (launcher, adaptive, monochrome, notification), splash, web favicons and touch icons, and Open Graph images
