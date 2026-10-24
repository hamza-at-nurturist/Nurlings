# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal (no migration). Verify: explicit approval in the session.

## 2. Change

- [x] 2.1 Add `ticketPrefix` to `brand.json` and validate it in `schema.ts`, reusing the board
  prefix rule; add schema tests (valid, empty, leading digit, symbol, too long). Verify: `vitest`
  on the brand package passes.
- [x] 2.2 Pass `brand.ticketPrefix` from `ensureBoard` and add the db dependency on
  `@nurlings/brand`; extend the board test so a new board gets `NUR`. Verify: `vitest` on the db
  and adapters packages passes; typecheck and lint pass.
- [x] 2.3 `openspec validate ticket-prefix --strict`, `pnpm brand:check`, and the unit suites pass.

## 3. After merge

- [x] 3.1 Archive the change.
