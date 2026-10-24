## ADDED Requirements

### Requirement: The Android APK release is Nurlings-branded
The `release-android-apk` workflow SHALL publish the APK as `nurlings.apk` on a release titled
"Nurlings for Android <version> (<version code>)", SHALL NOT mention Rakazo or the upstream Expo
project in its file names, title, notes or messages, and SHALL say the Nurlings Expo project when
`EXPO_TOKEN` is missing. It SHALL NOT claim the APK updates over the air while mobile updates are
off.

#### Scenario: Release published
- **WHEN** the workflow runs from `main` with `EXPO_TOKEN` set
- **THEN** the rolling `android` release carries `nurlings.apk` under the Nurlings title and `rakazo.apk` is not published

#### Scenario: Token missing
- **WHEN** the workflow runs without `EXPO_TOKEN`
- **THEN** it fails with a message naming the `nurturist-ai` Expo project
