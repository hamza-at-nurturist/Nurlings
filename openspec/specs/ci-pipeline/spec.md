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
