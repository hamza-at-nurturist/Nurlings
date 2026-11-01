# ci-pipeline Specification

## Purpose
Defines which CI jobs run on pull requests and which only on `main`: the cheap checks always run and superseded runs are cancelled, Web E2E runs when the web stack changes, and the native computer jobs run on `main` only.

## Requirements

### Requirement: Cheap checks run on every pull request
Lint, Typecheck and Unit tests SHALL run on every pull request, and superseded runs of the same
pull request SHALL be cancelled.

#### Scenario: New push to a pull request
- **WHEN** a new commit is pushed to a pull request while its CI is running
- **THEN** the older run is cancelled

### Requirement: Web E2E runs when the web stack changes
On a pull request, Web E2E SHALL run only when the change touches something the end-to-end stack
depends on, as decided by `.github/scripts/changed-areas.sh`. On a push to `main` it SHALL always
run.

#### Scenario: Web change
- **WHEN** a pull request changes `apps/web/src/main.tsx`
- **THEN** Web E2E runs

#### Scenario: Unrelated change
- **WHEN** a pull request changes only files the end-to-end stack does not use
- **THEN** Web E2E is skipped

#### Scenario: Push to main
- **WHEN** a commit is pushed to `main`
- **THEN** Web E2E runs

### Requirement: Native computer jobs run on main only
The macOS and Windows Native computer jobs SHALL run on pushes to `main` and SHALL NOT run on
pull requests.

#### Scenario: Pull request
- **WHEN** a pull request changes code
- **THEN** the macOS and Windows Native computer jobs are skipped

#### Scenario: Push to main
- **WHEN** a commit is pushed to `main`
- **THEN** both Native computer jobs run

### Requirement: The Playwright report tolerates a skipped Web E2E
The Playwright report workflow SHALL finish successfully, without publishing anything, when the CI
run it follows skipped Web E2E, and SHALL skip the screenshot gallery with a notice, instead of
failing, when its storage is not configured.

#### Scenario: Docs-only pull request
- **WHEN** a pull request changes no end-to-end path and Web E2E is skipped
- **THEN** the report workflow ends green and publishes nothing

#### Scenario: Web change
- **WHEN** Web E2E ran and finished
- **THEN** the report workflow reads its result and continues as before

#### Scenario: No gallery storage
- **WHEN** Web E2E ran but the storage variables are not set
- **THEN** the report workflow ends green with a notice and the screenshots stay in the run's artifacts

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

### Requirement: Upstream-only jobs stay off the fork
Jobs that publish to upstream's Expo project, deploy to upstream's host, push upstream's images,
run its dependency agent or release its App Store app SHALL run only in `elie222/rakazo`, and the
brand guard SHALL run with lint and again on the built web app.

#### Scenario: A push to main on the fork
- **WHEN** a commit is pushed to the fork's `main`
- **THEN** the mobile update, production deploy, server image and weekly dependency jobs do not run, and the brand checks do
