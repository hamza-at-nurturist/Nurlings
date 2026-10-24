## ADDED Requirements

### Requirement: Android preview builds install next to the real app
The `release-android-apk` workflow SHALL accept a `preview` input that builds the branch it runs
on as "Nurlings Preview" with the Android package `com.nurturistai.nurlings.preview`, publishes
`nurlings-preview.apk` on the `android-preview` prerelease, and leaves the `android` release and
`nurlings.apk` untouched.

#### Scenario: Preview from a branch
- **WHEN** the workflow is run with `preview` on a branch other than `main`
- **THEN** the `android-preview` prerelease carries `nurlings-preview.apk`, the `android` release is unchanged, and the app installs beside the real one

#### Scenario: Main release
- **WHEN** the workflow runs without `preview`
- **THEN** it runs only from `main` and publishes `nurlings.apk` on the `android` release as before
