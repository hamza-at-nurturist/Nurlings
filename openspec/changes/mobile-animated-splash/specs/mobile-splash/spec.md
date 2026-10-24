## ADDED Requirements

### Requirement: Animated brand splash on mobile
On launch the mobile app SHALL show a full-screen splash on navy `#03091F` in which the Nurlings
mark animates over softly glowing fireflies and then fades into the app. The first launch after an
install SHALL play the full 6 second timeline; later launches SHALL play a short version and exit
as soon as the app is ready.

#### Scenario: First launch after install
- **WHEN** the app launches for the first time after an install and is ready before the splash reaches 82% of its timeline
- **THEN** the full timeline plays once, including the exit "boop" at 84% and the pop rings, and the splash then fades into the app

#### Scenario: Later launch
- **WHEN** the app launches again and becomes ready
- **THEN** the short version plays and the exit "boop" starts as soon as the app is ready, without waiting for the pop-in to finish and without delaying the app

#### Scenario: Tap to skip
- **WHEN** the person taps anywhere on the splash
- **THEN** the exit starts at once, in any mode

#### Scenario: App not ready in time
- **WHEN** the app is not ready when a full run reaches 82%, or a short run has finished its pop-in
- **THEN** the splash idles (both characters blink every few seconds, fireflies continue) and plays the exit only after the app is ready

#### Scenario: Reduced motion
- **WHEN** the system reduce-motion setting is on
- **THEN** the splash shows the static mark for about 600 ms (longer only until the app is ready) and then the app, with no animation

#### Scenario: The app is always reached
- **WHEN** the app launches in any mode, including the first launch after an install and with reduced motion on
- **THEN** the splash ends and the sign-in screen or the chats appear

#### Scenario: Screen readers
- **WHEN** a screen reader is on
- **THEN** the splash exposes no content and adds no words on screen

### Requirement: Plain native splash, unchanged icon
The native splash SHALL be plain `#03091F` with no visible image and SHALL be hidden as soon as the animated splash is on screen. The app icon SHALL NOT change.

#### Scenario: No flash from the native splash
- **WHEN** the native splash hands over to the JS splash
- **THEN** both are the same plain `#03091F` at the first frame

#### Scenario: Icon
- **WHEN** the Expo configuration is resolved
- **THEN** the app icon is the same as before this change
