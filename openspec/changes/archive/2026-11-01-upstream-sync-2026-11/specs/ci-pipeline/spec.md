## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Runs for a merge to main are never cancelled
**Reason**: CI is upstream's again. Pull request runs are cancelled by a newer push, and on `main`
each job that leads to a deploy holds a per-job lock, so a burst of merges deploys the newest commit
without cancelling work in progress. The fork's per-commit concurrency group and its test are gone.
**Migration**: None; the behavior that mattered (a merge to `main` is never left without a run) holds
under upstream's locks.

## ADDED Requirements

### Requirement: Upstream-only jobs stay off the fork
Jobs that publish to upstream's Expo project, deploy to upstream's host, push upstream's images,
run its dependency agent or release its App Store app SHALL run only in `elie222/rakazo`, and the
brand guard SHALL run with lint and again on the built web app.

#### Scenario: A push to main on the fork
- **WHEN** a commit is pushed to the fork's `main`
- **THEN** the mobile update, production deploy, server image and weekly dependency jobs do not run, and the brand checks do
