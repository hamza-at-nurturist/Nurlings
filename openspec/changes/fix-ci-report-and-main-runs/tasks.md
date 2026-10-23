# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for both fixes (report workflow tolerating a skipped Web E2E, and main
  never cancelled). Verify: explicit request in the session.

## 2. Report workflow

- [x] 2.1 Make the job lookup return `none` for no job, end the step with a notice and `ran=false`
  for `none` or `skipped`, and gate the later steps on `ran == 'true'`. Verify: the publication
  test runs the real filter with `jq` against fixtures and checks the gating.

## 3. Main is never cancelled

- [x] 3.1 Group `ci` runs by pull request number, otherwise by commit SHA. Verify: the new
  `ci-main-concurrency` test.

## 4. Checks and wrap-up

- [x] 4.1 `openspec validate fix-ci-report-and-main-runs --strict`, lint, and the workflow-reading
  tests pass.
- [ ] 4.2 After merge, confirm the next docs-only pull request's report run ends green with the
  notice, and that three quick merges to `main` leave no cancelled `ci` run. Verify: the Actions
  run list.
- [ ] 4.3 Archive the change.
