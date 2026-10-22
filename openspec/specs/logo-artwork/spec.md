# logo-artwork Specification

## Purpose
Defines the Nurlings logo artwork as the single source of every icon, favicon, splash screen and
in-app mark across the web, desktop and mobile apps, and the rules the generated files must meet.

## Requirements

### Requirement: One set of vector sources
The artwork SHALL come from four SVG files in `packages/brand/assets`: the square app icon, the
transparent full mark, the blob alone, and the original composition (reference only). The brand
configuration SHALL describe the same shapes and the brand colours, and a check SHALL fail when
the two disagree.

#### Scenario: Sources and configuration agree
- **WHEN** the brand check runs
- **THEN** the blob and orb paths, the viewBoxes and the gradient in `brand.json` equal those in the SVG files

#### Scenario: A source is replaced
- **WHEN** an SVG source changes without the configuration or the generated icons being updated
- **THEN** the brand check fails and names the stale file

### Requirement: Brand colours
The brand configuration SHALL define navy `#03091F` as the icon and splash background, white
`#FFFFFF` for the blob, and the orb gradient `#4FFFDB`, `#6AAEF6`, `#8F7AFB`.

#### Scenario: Splash and icon background
- **WHEN** the mobile splash and the icon plate are built
- **THEN** both use the navy value from the brand configuration

### Requirement: Generated icons come from the sources
Every web, desktop and mobile icon, favicon, splash and notification icon SHALL be generated from
the sources at the documented sizes and platform rules: the app icon is opaque and full-bleed, and
the favicons, the Android themed icon and the notification icon use the blob alone.

#### Scenario: Sizes and alpha
- **WHEN** the brand check runs
- **THEN** every generated file exists at its documented size, and the iOS and Android legacy icons have no transparency

#### Scenario: Small icons
- **WHEN** the 16 and 32 pixel favicons and the notification icon are inspected
- **THEN** they show the blob alone and none of the orb

### Requirement: Android adaptive art stays in the safe zone
The Android adaptive foreground and themed icon SHALL keep all visible pixels inside the central
circle that is 66% of the layer.

#### Scenario: Safe zone
- **WHEN** the adaptive foreground and monochrome sources are measured
- **THEN** no visible pixel lies outside a circle of 676 pixels centred in the 1024 pixel layer

### Requirement: Android adaptive art fills the safe zone
The Android adaptive foreground and themed icon SHALL be placed as large as the safe zone allows,
reaching at least 95% of its radius and never beyond it.

#### Scenario: Not left small
- **WHEN** the adaptive foreground and themed icon sources are measured
- **THEN** their farthest visible pixel is between 95% and 100% of the safe radius from the centre

### Requirement: Wordmark typeface
The product name in the wordmark SHALL be set in Poppins Medium (500) with letter-spacing -0.02em,
self-hosted in `packages/brand` with its licence and a fallback font stack. No other text in the
UI SHALL change typeface.

#### Scenario: Offline
- **WHEN** the wordmark is shown with no network
- **THEN** it renders in the bundled Poppins, not a downloaded or system font

#### Scenario: Font fails to load
- **WHEN** the font file cannot be loaded
- **THEN** the wordmark renders in the fallback stack at the same weight and spacing

### Requirement: Static wordmark exports
The package SHALL provide the wordmark as two static SVG files with fixed colours for use outside
the app: one with navy text for light backgrounds and one with white text for dark backgrounds.
Each SHALL embed the wordmark typeface and use no `currentColor`.

#### Scenario: Fixed colours
- **WHEN** the brand check runs
- **THEN** the light file sets its text in the brand navy, the dark file in the brand white, and neither uses `currentColor`

#### Scenario: Same appearance as an image
- **WHEN** either file is opened as an image
- **THEN** the name is set in Poppins Medium without the font being installed

### Requirement: Animated marks
The intro animation SHALL be used on the sign-in screen, the desktop setup screen and the web
app's opening screen, and the loop animation in full loading states. Both SHALL be plain images
on the navy plate, and SHALL show the static mark instead for prefers-reduced-motion or if the
image cannot load. Small inline spinners SHALL be unchanged.

#### Scenario: Reduced motion
- **WHEN** a person has asked for reduced motion
- **THEN** the screens above show the static mark and no animation runs

#### Scenario: Image fails
- **WHEN** an animation file cannot load
- **THEN** the static mark is drawn in its place

#### Scenario: Files are safe and branded
- **WHEN** the brand check runs
- **THEN** both files draw the blob and eyes from the brand configuration, use the brand gradient colours, switch animation off for reduced motion, and contain no script or external links

### Requirement: In-app logo matches the icon
The in-app mark SHALL draw the blob and orb from the brand configuration, with the blob in the
surrounding text colour and the orb in its gradient, and the wordmark SHALL show the mark on the
navy plate beside the product name.

#### Scenario: Theme colours
- **WHEN** the in-app mark is shown on a light or a dark theme
- **THEN** the blob follows the text colour and the orb keeps its gradient

#### Scenario: Two marks on one page
- **WHEN** two marks are rendered together
- **THEN** each has its own gradient definition

#### Scenario: Desktop setup
- **WHEN** the desktop setup window opens
- **THEN** it shows the intro animation on the navy plate above its heading and names the product, not the upstream
