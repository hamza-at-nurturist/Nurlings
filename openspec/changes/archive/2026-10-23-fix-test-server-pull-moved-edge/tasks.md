# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the approach (`pull_policy` through `NURLINGS_PULL_POLICY`, default
  `missing`, `always` on the test server only). Verify: explicit approval in the session.

## 2. Compose file, runbook and test

- [x] 2.1 Add `pull_policy: ${NURLINGS_PULL_POLICY:-missing}` to the five first-party image
  services and note the variable at the top of the file. Verify: the compose test below.
- [x] 2.2 Document the variable in the runbook's variable table and test-server section. Verify:
  the runbook test that checks every documented variable is read by the compose file.
- [x] 2.3 Extend `coolify-compose.test.ts`: all five services carry the variable with the default
  `missing`, and `always` is never hardcoded. Verify: `vitest` on that file passes.
- [x] 2.4 `openspec validate fix-test-server-pull-moved-edge --strict`, lint, and the compose and
  CI-path tests pass.

## 3. After merge

- [x] 3.1 Maintainer pastes the updated compose into the `nurlings-test` resource, sets
  `NURLINGS_PULL_POLICY=always` there, and redeploys. Verify: the runbook's revision check prints
  the latest `main` commit.
- [x] 3.2 Archive the change.
