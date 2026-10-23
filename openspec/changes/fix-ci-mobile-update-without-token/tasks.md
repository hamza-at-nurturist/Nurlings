# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for the mobile update job to skip with a notice when the token is not
  set. Verify: explicit request in the session.

## 2. Workflow and test

- [x] 2.1 Replace the "Require Expo automation token" step with a check that outputs
  `configured`, prints a notice and a summary note when unset, and succeeds; gate the six later
  steps on it. Verify: the new `ci-mobile-update-token` test.
- [x] 2.2 `openspec validate fix-ci-mobile-update-without-token --strict`, lint, and the
  workflow-reading tests pass.

## 3. After merge

- [ ] 3.1 Confirm the merge's own `ci` run on `main` ends green with the notice (this change edits
  `ci.yml`, so the job runs its token check). Verify: the Actions run.
- [ ] 3.2 Archive the change.
