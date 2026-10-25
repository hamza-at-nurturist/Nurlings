# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and the decisions in `design.md`. Verify: explicit
  approval in the session.

## 2. Backend

- [ ] 2.1 Prisma: `Ticket.needsUser` (boolean, default false) in one additive migration. Verify: the
  migration applies on an empty and an existing database; the row-security coverage test still
  passes; the previous release's queries still work.
- [ ] 2.2 Contracts: `needsUser` on `TicketSchema` (default false), `approved` in
  `TICKET_EVENT_KINDS`, `ApproveTicketInput`, `tickets.approve`. Verify: contract tests accept old
  shapes and the new ones.
- [ ] 2.3 `approveTicket` in `ticket-approve.ts`: row lock, In review only, Done with completion
  stamp, `approved` event, board notification, no wake. Verify: unit tests for approve, a ticket not
  in review, a missing ticket, and a second approve.
- [ ] 2.4 `commentTicket`: lock the ticket; for a user's comment on an In review or Blocked ticket
  set In progress and record a `status` event for that user; set `needsUser` from "a Nurling's
  comment that mentions the user". Verify: unit tests for each status, a Nurling's comment (no
  move), mention then plain comment then user reply (flag set, cleared, cleared), and the wake still
  happening.
- [ ] 2.5 `toTicketDto` returns `needsUser` false for Done and Won't do. Verify: unit test.
- [ ] 2.6 `mention_user` tool description says to use it when the user's answer or decision is
  needed. Verify: tool schema test.
- [ ] 2.7 `tickets.approve` handler in the router. Verify: router test for success and refusal.
- [ ] 2.8 Real-Postgres test through the app: reply on a ticket in review, approve, needs-you
  flag. Verify: test passes against the real database.

## 3. Web

- [ ] 3.1 `ApproveButton` in the modal header, shown only while In review, calls `tickets.approve`,
  shows the server's error and refreshes. Verify: component tests for shown/hidden by status, click,
  and refusal.
- [ ] 3.2 `NeedsYou` badge (ui-web badge, semantic tokens) in the modal header and on the card.
  Verify: component tests for shown and hidden.
- [ ] 3.3 Feed line `{actor} approved it`. Verify: component test with "You".
- [ ] 3.4 Lingui: extract and compile. Verify: no new untranslated source strings beyond the three
  quoted in the PR.

## 4. Evidence

- [ ] 4.1 Extend `apps/web/e2e/board.spec.ts`: a ticket in review shows Approve, approving moves it
  to Done and shows "You approved it"; a reply on a ticket in review moves it to In progress;
  capture a screenshot. Verify: CI E2E passes and the screenshot is linked in the PR.

## 5. Checks

- [ ] 5.1 `openspec validate ticket-approve --strict`, typecheck, lint and the unit suites pass.

## 6. After merge

- [ ] 6.1 Archive the change.
