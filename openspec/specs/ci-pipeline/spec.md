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
On a pull request, Web E2E SHALL run only when the change touches `apps/web`, `apps/api`,
`packages/ui-*`, `packages/chat-ui`, `packages/contracts` or another path the end-to-end stack
depends on (all of `packages/`, `apps/worker`, `apps/www`, the root build files and the CI and
Playwright workflows, listed in `scripts/ci-e2e-paths.sh`). On a push to `main` it SHALL always run.

#### Scenario: Web change
- **WHEN** a pull request changes `apps/web/src/main.tsx`
- **THEN** Web E2E runs

#### Scenario: Unrelated change
- **WHEN** a pull request changes only `apps/mobile` or `apps/desktop` files
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

### Requirement: Runs for a merge to main are never cancelled
Each push to `main` SHALL have a CI run that runs to completion. Only the older run of the same
pull request SHALL be cancelled by a newer push. The CI concurrency group SHALL therefore be the
pull request number for pull requests and the commit for every other event, not a branch-wide
group that keeps only one waiting run.

#### Scenario: Three quick merges
- **WHEN** a second and a third merge land on `main` while the CI run of an earlier merge is still running
- **THEN** all three later runs start and finish, and none is cancelled

#### Scenario: New push to a pull request
- **WHEN** a new commit is pushed to a pull request while its CI is running
- **THEN** the older run is cancelled

### Requirement: The Playwright report tolerates a skipped Web E2E
The Playwright report workflow SHALL finish successfully, with a notice and without publishing
anything, when the CI run it follows has no Web E2E job or the job was skipped. It SHALL still fail
when the job is missing for any other reason, such as more than one job with that name.

#### Scenario: Docs-only pull request
- **WHEN** a pull request changes no end-to-end path and Web E2E is skipped
- **THEN** the report workflow ends green with a notice and runs no later step

#### Scenario: Web change
- **WHEN** Web E2E ran and finished
- **THEN** the report workflow reads its result and continues as before

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
