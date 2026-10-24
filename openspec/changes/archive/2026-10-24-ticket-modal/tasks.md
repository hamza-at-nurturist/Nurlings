# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the three decisions in it. Verify: explicit approval
  in the session.

## 2. Backend

- [x] 2.1 Prisma: add `TicketEvent` and `Task.ticketId` with one additive migration. Verify:
  `prisma validate` and the migration applies on an empty and an existing database; the previous
  release's queries still work (no drop or rename).
- [x] 2.2 Contracts: `TicketEventSchema` and `tickets.events` in `packages/contracts`. Verify:
  contract unit test round-trips the schema.
- [x] 2.3 Record `created`, `status` and `owner` events inside the `createTicket` and
  `updateTicket` transactions; only on a real change. Verify: unit tests for each kind, for no
  event when nothing changed, and for the actor (user or Nurling).
- [x] 2.4 `tickets.events` handler in `router.ts`, space-isolated like `tickets.comments`. Verify:
  router test for results, order and cross-space isolation.
- [x] 2.5 `commentTicket` wakes the assignee for a user comment on an open ticket, never for a
  Nurling comment or a finished ticket; queued-run dedupe. Verify: unit tests for each scenario in
  the spec.
- [x] 2.6 `wakeTicketAssignee` sets `Task.ticketId` and uses the new prompt; add two sentences to
  `TICKET_SILENT_REPLY_GUIDANCE`: (a) when blocked on the user, comment the question, set Blocked and
  still send the ask card; (b) anything the user should see or download (reports, CSVs, documents)
  is attached with `attach_file`, while scratch and working files are not. Verify: unit tests
  assert the stored `ticketId`, the prompt reads the new comments, and the guidance carries both
  instructions.
- [x] 2.7 Files: a read path that returns the latest artifact of each family attached by runs of
  tasks with this `ticketId`. Verify: test with two tickets and a versioned artifact, and that a
  file only written to the workspace is not listed.

## 3. Web

- [x] 3.1 `TicketModal/` components and `use-ticket-activity`; reuse `BotAvatar`, shadcn parts and
  tokens, no hex. Verify: component tests for the properties edits, the merged feed order, live
  refresh on a board event, the file section hidden when empty, and avatar fallbacks.
- [x] 3.2 `Board.tsx`: open the new modal for an existing ticket, keep `TicketDialog` for new.
  Verify: the diff is a few lines; `Board.test.tsx` passes.
- [x] 3.3 Lingui: add the new strings, run `pnpm --filter @rakazo/web intl:extract` and compile.
  Verify: no missing-message warnings.

## 4. Evidence

- [x] 4.1 Extend `apps/web/e2e/board.spec.ts`: open the modal, change status through the pill,
  post a reply, see both in the feed; capture a screenshot. Verify: CI E2E passes and the
  screenshot is linked in the PR.

## 5. Checks

- [x] 5.1 `openspec validate ticket-modal --strict`, typecheck, lint and the unit suites pass.

## 6. After merge

- [x] 6.1 Archive the change.
- [x] 6.2 Tell the maintainer change 2 (`ticket-mentions`) can start.
