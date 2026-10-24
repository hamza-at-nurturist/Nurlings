## ADDED Requirements

### Requirement: Animated brand splash on mobile
On launch the mobile app SHALL show a full-screen splash on navy `#03091F`: the Nurlings mark
(Chief and its orb, drawn from the brand configuration's mark paths) animates on one 6 second
timeline over softly glowing fireflies, then fades into the app. The native splash SHALL be plain
`#03091F` and SHALL be hidden as soon as this splash is on screen. The app icon SHALL NOT change.

#### Scenario: Cold start
- **WHEN** the app launches and is ready before the splash reaches 82% of its timeline
- **THEN** the full timeline plays once, including the exit "boop" at 84% and the pop rings, and the splash then fades into the app

#### Scenario: App not ready in time
- **WHEN** the app is not ready when the timeline reaches 82%
- **THEN** the splash idles (both characters blink every few seconds, fireflies continue) and plays the exit only after the app is ready

#### Scenario: Reduced motion
- **WHEN** the system reduce-motion setting is on
- **THEN** the splash shows the static mark for about 600 ms (longer only until the app is ready) and then the app, with no animation

#### Scenario: No flash from the native splash
- **WHEN** the native splash hands over to the JS splash
- **THEN** both are the same plain `#03091F` at the first frame

#### Scenario: Screen readers
- **WHEN** a screen reader is on
- **THEN** the splash exposes no content and adds no words on screen
