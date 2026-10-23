## ADDED Requirements

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
