# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for the failing shake test (issue 96) to be fixed. Verify: explicit
  request in the session.

## 2. Fix

- [x] 2.1 Run the shake test on the test clock and advance it per pointer move. Verify: the test
  passes locally, including with the slow-runner timing that failed before.

## 3. After merge

- [ ] 3.1 Watch Web E2E on following pull requests for a recurrence. Verify: no failed
  `avatar-states` run in the Actions list.
- [ ] 3.2 Close issue 96 and archive the change with `--skip-specs` (a test fix has no spec delta).
