# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for the flaky end-to-end failures to be investigated and fixed when the
  cause is test timing. Verify: explicit request in the session.

## 2. Fix

- [x] 2.1 Wait for the reset mail addressed to the test's own account instead of for any mail, and
  open that link. Verify: typecheck and lint pass; the spec passes in CI on this pull request.

## 3. After merge

- [ ] 3.1 Watch `main` for a recurrence of this failure over the next merges. Verify: no failed
  `auth-lifecycle` shard in the Actions run list.
- [ ] 3.2 Archive the change with `--skip-specs` (a test fix has no spec delta).
