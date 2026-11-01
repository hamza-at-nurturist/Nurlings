# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for the layout fix to be done first. Verify: explicit request in the
  session.

## 2. Fix

- [x] 2.1 Stop the filter row growing (`flexGrow: 0`). Verify: `pnpm --filter @rakazo/mobile
  check` passes; on a device the columns start directly under the filter row.
- [x] 2.2 Let card text shrink and wrap inside its rows. Verify: `board-column.test.tsx` still
  passes; on a device a long title and long dates stay inside the card.

## 3. Pull request

- [ ] 3.1 Open the PR on `fix/mobile-board-layout`, state that native layout cannot be captured by
  CI, and stay with it until CI is done. Verify: checks green on the head commit.

## 4. After merge

- [ ] 4.1 Archive with `--skip-specs`. Verify: `openspec validate --strict`.
