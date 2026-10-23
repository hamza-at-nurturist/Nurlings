# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and decides on the existing-boards migration. Verify:
  explicit approval in the session.

## 2. Change

- [ ] 2.1 Add `ticketPrefix` to `brand.json` and validate it in `schema.ts`, reusing the board
  prefix rule; add schema tests (valid, empty, leading digit, symbol, too long). Verify: `vitest`
  on the brand package passes.
- [ ] 2.2 Pass `brand.ticketPrefix` from `ensureBoard` and add the db dependency on
  `@nurlings/brand`; extend the board test so a new board gets `NUR`. Verify: `vitest` on the db
  and adapters packages passes; typecheck and lint pass.
- [ ] 2.3 Add the one-statement migration for boards still on `RAK` (skip if declined in 1.1).
  Verify: applied to a scratch database, a `RAK` board becomes `NUR` and a custom one is unchanged;
  `prisma migrate` reports no drift.
- [ ] 2.4 `openspec validate ticket-prefix --strict`, `pnpm brand:check`, and the unit suites pass.

## 3. After merge

- [ ] 3.1 Archive the change.
