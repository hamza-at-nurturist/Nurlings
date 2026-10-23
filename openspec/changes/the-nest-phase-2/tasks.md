# Tasks

> Scope: phase 2 only. Nothing under "Out of scope" in the proposal gets code.

## 1. Approval and base

- [ ] 1.1 Maintainer approves the proposal and the six decisions in it (indicator A or B, today
  boundary, last-activity source, answerable asks, stat definitions). Verify: explicit approval in
  the session.
- [ ] 1.2 Bring `main` up to date and confirm #23 (the takeover booting fix, touches `Shell.tsx`)
  is in the branch before any code. Verify: `git log` shows its merge commit in the branch.

## 2. Backend and contracts

- [ ] 2.1 Contracts: optional `dayStart` input, `lastActivity` on a Nurling, `options` on a tray
  item, and the `today` key. Verify: contract test parses a full and a minimal payload and rejects
  a bad option.
- [ ] 2.2 `apps/api/src/nest.ts`: attention ordering and last activity. Verify: stubbed unit tests
  for each ordering case with stable roster order, and for last activity (newest finished run,
  background excluded, never-ran is null).
- [ ] 2.3 `apps/api/src/nest.ts`: `today` stats and ask options. Verify: stubbed tests for the
  counts, routine subset, null tokens, the 24 hour clamp, the UTC default, options on a plain
  question only, and none on secret, approval or takeover.

## 3. Web

- [ ] 3.1 Mood ring and label (option chosen in 1.1); remove the eyes badge under A. Verify:
  component test for ring and label per mood and no animation under reduced motion; light and dark
  checked in the E2E screenshot.
- [ ] 3.2 Idle card last activity and the `NestStats` line. Verify: web tests for last activity
  shown only without a current task, failed hidden at zero, line hidden when all zero.
- [ ] 3.3 Tray answers in place. Verify: web tests that choosing an option calls
  `threads.answer` with the right target (bot and group), disables during the call, shows the
  error on failure, and that secret, approval and takeover items have no buttons.
- [ ] 3.4 Send the local start of day with the poll, still visible-only and never overlapping.
  Verify: the phase 1 polling tests pass unchanged plus one asserting the input.
- [ ] 3.5 Update the Nest Playwright spec to cover ordering, the label and an in-place answer.
  Verify: CI web E2E passes; link its screenshot on the PR.

## 4. Checks and wrap-up

- [ ] 4.1 Lingui extract, typecheck, lint, unit tests, `openspec validate the-nest-phase-2
  --strict`. Verify: all pass.
- [ ] 4.2 Open the PR, quoting every new user-facing word and why, and listing each upstream edit.
  Stay with it until CI is done.
- [ ] 4.3 After merge, tell the maintainer when it is live on the test server. Verify: the
  server's revision check shows the merge commit.
- [ ] 4.4 Archive the change after the merge.
