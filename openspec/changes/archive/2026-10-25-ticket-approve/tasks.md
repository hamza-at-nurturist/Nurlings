# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the decisions in `design.md`. Verify: explicit
  approval in the session.

## 2. Backend

- [x] 2.1 Prisma: `Ticket.needsUser` (boolean, default false) in one additive migration. Verify: the
  migration applies on an empty and an existing database; the row-security coverage test still
  passes; the previous release's queries still work.
- [x] 2.2 Contracts: `needsUser` on `TicketSchema` (default false), `approved` in
  `TICKET_EVENT_KINDS`, `ApproveTicketInput`, `tickets.approve`. Verify: contract tests accept old
  shapes and the new ones.
- [x] 2.3 `approveTicket` in `ticket-approve.ts`: row lock, In review only, Done with completion
  stamp, `approved` event, board notification, no wake. Verify: unit tests for approve, a ticket not
  in review, a missing ticket, and a second approve.
- [x] 2.4 `commentTicket`: lock the ticket; for a user's comment on an In review or Blocked ticket
  set In progress and record a `status` event for that user, unless its stored mentions are only
  non-owner Nurlings (then no move and no owner wake, in any status); set `needsUser` from "a
  Nurling's comment that mentions the user". Verify: unit tests for each status, a comment
  mentioning only others, one mentioning the owner and others, a Nurling's comment (no move),
  mention then plain comment then user reply (flag set, cleared, cleared), and the wake.
- [x] 2.5 `updateTicket` clears `needsUser` when a user changes the status. Verify: unit tests for a
  user's status change (cleared), a user's title change (kept) and a Nurling's status change (kept).
- [x] 2.6 `toTicketDto` returns `needsUser` false for Done and Won't do. Verify: unit test.
- [x] 2.7 `mention_user` tool description says to use it when the user's answer or decision is
  needed. Verify: tool schema test.
- [x] 2.8 `tickets.approve` handler in the router. Verify: router test for success and refusal.
- [x] 2.9 Real-Postgres test through the app: reply on a ticket in review, approve, needs-you
  flag. Verify: test passes against the real database.

## 3. Web

- [x] 3.1 Approve button in the modal header, shown only while In review, calls `tickets.approve`,
  shows the server's error and refreshes. Verify: component tests for shown/hidden by status, click,
  and refusal.
- [x] 3.2 `NeedsYou` badge (ui-web badge, semantic tokens) in the modal header and on the card.
  Verify: component tests for shown and hidden.
- [x] 3.3 Feed line `{actor} approved it`. Verify: component test with "You".
- [x] 3.4 Lingui: extract and compile. Verify: no new untranslated source strings beyond the three
  quoted in the PR.

## 4. Evidence

- [x] 4.1 Extend `apps/web/e2e/board.spec.ts`: a ticket in review shows Approve, approving moves it
  to Done and shows "You approved it"; a reply on a ticket in review moves it to In progress;
  capture a screenshot. Verify: CI E2E passes and the screenshot is linked in the PR.

## 5. Checks

- [x] 5.1 `openspec validate ticket-approve --strict`, typecheck, lint and the unit suites pass.
- [x] 5.2 Fix the reply box caret after picking a mention: it was placed a frame late, so a fast
  first keystroke landed at the end of the text (the board E2E failed on `main` this way). Verify:
  a component test that fails before the fix, and the board E2E passing in CI.

## 6. After merge

- [x] 6.1 Archive the change.
