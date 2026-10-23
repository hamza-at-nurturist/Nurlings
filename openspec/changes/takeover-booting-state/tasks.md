# Tasks

> Approved by the maintainer: client-only approach.

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the client-only approach. Verify: explicit approval
  in the session.

## 2. Fix

- [x] 2.1 Add `apps/web/src/lib/computer-boot-watch.ts` (hook) and its unit tests (recovery, no
  polling when running, closed, hidden or with an own start in flight, no overlap, non-retryable
  error, the 5-minute bound). Verify: `vitest` on the new test file passes.
- [x] 2.2 Use the hook in `Shell.tsx` with the existing computer refresh. Verify: typecheck, lint,
  and the existing web tests pass; the golden takeover test passes in CI.
- [x] 2.3 `openspec validate takeover-booting-state --strict` and the full unit suites pass.

## 3. After merge

- [ ] 3.1 Watch `main` for a recurrence of the stuck "Booting live desktop…" failure. Verify: no
  failed golden takeover shard over the next merges.
- [ ] 3.2 Archive the change.
