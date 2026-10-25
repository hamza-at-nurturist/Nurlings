# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the decisions in `design.md`. Verify: explicit
  approval in the session.

## 2. Data and contracts

- [x] 2.1 Prisma: the ticket date columns, reminder flags and indexed `scheduleAt`, in one additive
  migration. Verify: applies on an empty and an existing database; row-security coverage still passes.
- [x] 2.2 Contracts: `start` / `due` (local date or date-time, or null) on create and update input,
  with the start-before-due refine; `startAt`, `startHasTime`, `dueAt`, `dueHasTime` on
  `TicketSchema` with defaults. Verify: contract tests for old and new shapes and bad input.
- [x] 2.3 `toTicketDto` returns the dates. Verify: unit test.

## 3. Backend

- [x] 3.1 `ticket-dates.ts`:
  - `resolveTicketDate`, which applies 9 AM or 23:59 in the timezone and is DST-safe;
  - the reminder times;
  - `nextTicketScheduleAt`;
  - the flag updates for a date change.

  Verify: unit tests for date-only and timed input, a DST day, UTC fallback, and a past reminder
  that is skipped.
- [x] 3.2 `createTicket` / `updateTicket` resolve and save dates in the acting user's timezone,
  check start before due against stored values, and recompute `scheduleAt`. The assignment wake is
  deferred while the start is in the future, and the owner is woken when a pending future start is
  cleared or moved to the past. Verify: unit tests for each case, including that a Nurling editing
  its own ticket is not woken.
- [x] 3.3 The `ticket.dates` job (adapter-kit name, payload schema and builder) and its handler,
  which runs as the ticket's tenant:
  - it locks and re-reads the ticket, and does nothing when `scheduleAt` is later or null;
  - it fires the start wake, the heads-up (with its prompt) and the overdue push only for an open
    ticket that has an owner;
  - it marks each reminder handled and recomputes `scheduleAt`.

  Verify: unit tests for each reminder, a stale job, a closed ticket, and start and heads-up at the
  same time (one wake).
- [x] 3.4 `wakeTicketAssignee` takes an optional prompt; the mention push helper is generalised and
  reused for the overdue push. Verify: existing wake and mention tests still pass; a new push test.
- [x] 3.5 The reconciler hook `reconcileTicketDates` (the routine lookahead pattern) wired in the
  worker and in the API's in-memory mode, plus the handler in both. Verify: reconciler unit test
  that a ticket inside the lookahead is enqueued with its time, and one outside it or without an
  owner is not.
- [x] 3.6 `ticket_create` / `ticket_update` take `start` and `due` (`builtin-tools.ts` schema, four
  lines in `executor.ts`). Verify: tool schema test; executor test that the args reach the ticket.
- [x] 3.7 Postgres test through the app:
  1. set a due with a time;
  2. run the reconciler and the job at the heads-up time, and check that the owner's run is queued;
  3. move the due, and check that the old job does nothing;
  4. pass the due, and check that one push is sent.

  Verify: passes against the real database.

## 4. Web

- [x] 4.1 `pnpm exec shadcn add calendar` in `packages/ui-web` (official registry), with exact
  dependency versions, and export it. Verify: ui-web typecheck; no hex in the vendored file.
- [x] 4.2 `TicketModal/dates.ts`: quick picks and short relative display in a given timezone.
  Verify: unit tests for Today, Tomorrow, Yesterday, a weekday, another year, a time, and overdue.
- [x] 4.3 `DatePicker.tsx` with quick picks, calendar, "Add time" and "No date", and Start and Due in
  `Properties.tsx`. Verify: component tests for each control and the value sent.
- [x] 4.4 The card date line in `Board.tsx` (overdue in destructive), with the timezone read via
  `rpc.me` and passed to the modal. Verify: Board test for a card with and without dates.
- [x] 4.5 `TicketFileCard` shows "TXT · 22 B" on the ticket's Files; previewable files keep the shared
  card. Verify: component test; chat file-card tests unchanged.
- [x] 4.6 Lingui: extract. Verify: catalogs updated with only the quoted new strings.

## 5. Evidence

- [ ] 5.1 Extend `apps/web/e2e/board.spec.ts`: set a due with the picker, see it in the modal and on
  the card, and capture a screenshot. Verify: CI E2E passes and the screenshot is linked in the PR.

## 6. Checks

- [ ] 6.1 `openspec validate ticket-dates --strict`, typecheck, lint and the unit suites pass.

## 7. After merge

- [ ] 7.1 Archive the change.
