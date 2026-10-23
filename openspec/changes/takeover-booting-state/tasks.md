# Tasks

> Nothing is built before the maintainer approves this proposal (task 1.1).

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and the client-only approach. Verify: explicit approval
  in the session.

## 2. Fix

- [ ] 2.1 Add `apps/web/src/lib/computer-boot-watch.ts` (hook) and its unit tests (recovery, no
  polling when running, closed, hidden or with an own start in flight, no overlap, non-retryable
  error, the 5-minute bound). Verify: `vitest` on the new test file passes.
- [ ] 2.2 Use the hook in `Shell.tsx` with the existing computer refresh. Verify: typecheck, lint,
  and the existing web tests pass; the golden takeover test passes in CI.
- [ ] 2.3 `openspec validate takeover-booting-state --strict` and the full unit suites pass.

## 3. After merge

- [ ] 3.1 Watch `main` for a recurrence of the stuck "Booting live desktop…" failure. Verify: no
  failed golden takeover shard over the next merges.
- [ ] 3.2 Archive the change.
