# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and the three decisions in it. Verify: explicit approval
  in the session.

## 2. Backend

- [ ] 2.1 Prisma: add `TicketEvent` and `Task.ticketId` with one additive migration. Verify:
  `prisma validate` and the migration applies on an empty and an existing database; the previous
  release's queries still work (no drop or rename).
- [ ] 2.2 Contracts: `TicketEventSchema` and `tickets.events` in `packages/contracts`. Verify:
  contract unit test round-trips the schema.
- [ ] 2.3 Record `created`, `status` and `owner` events inside the `createTicket` and
  `updateTicket` transactions; only on a real change. Verify: unit tests for each kind, for no
  event when nothing changed, and for the actor (user or Nurling).
- [ ] 2.4 `tickets.events` handler in `router.ts`, space-isolated like `tickets.comments`. Verify:
  router test for results, order and cross-space isolation.
- [ ] 2.5 `commentTicket` wakes the assignee for a user comment on an open ticket, never for a
  Nurling comment or a finished ticket; queued-run dedupe. Verify: unit tests for each scenario in
  the spec.
- [ ] 2.6 `wakeTicketAssignee` sets `Task.ticketId` and uses the new prompt; add the blocked
  sentence to `TICKET_SILENT_REPLY_GUIDANCE`. Verify: unit tests assert the stored `ticketId`, the
  prompt reads the new comments, and the guidance carries the blocked instruction.
- [ ] 2.7 Files: a read path that returns the latest artifact of each family produced by runs of
  tasks with this `ticketId`. Verify: test with two tickets and a versioned artifact.

## 3. Web

- [ ] 3.1 `TicketModal/` components and `use-ticket-activity`; reuse `BotAvatar`, shadcn parts and
  tokens, no hex. Verify: component tests for the properties edits, the merged feed order, live
  refresh on a board event, the file section hidden when empty, and avatar fallbacks.
- [ ] 3.2 `Board.tsx`: open the new modal for an existing ticket, keep `TicketDialog` for new.
  Verify: the diff is a few lines; `Board.test.tsx` passes.
- [ ] 3.3 Lingui: add the new strings, run `pnpm --filter @rakazo/web intl:extract` and compile.
  Verify: no missing-message warnings.

## 4. Evidence

- [ ] 4.1 Extend `apps/web/e2e/board.spec.ts`: open the modal, change status through the pill,
  post a reply, see both in the feed; capture a screenshot. Verify: CI E2E passes and the
  screenshot is linked in the PR.

## 5. Checks

- [ ] 5.1 `openspec validate ticket-modal --strict`, typecheck, lint and the unit suites pass.

## 6. After merge

- [ ] 6.1 Archive the change.
- [ ] 6.2 Tell the maintainer change 2 (`ticket-mentions`) can start.
