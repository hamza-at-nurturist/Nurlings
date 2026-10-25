# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the decisions in `design.md`. Verify: explicit
  approval in the session.

## 2. Backend

- [x] 2.1 Two migrations, one statement each: `CREATE INDEX CONCURRENTLY` on `runs("taskId")` and
  on `artifacts("runId")`, with the matching `@@index` in `schema.prisma`. Verify: migrations apply
  on an empty and an existing database; `prisma migrate diff` is clean; row-security test passes.
- [x] 2.2 Contracts: `TicketListItemSchema` (`lastComment`, `fileCount`, `workingBotId`, all
  defaulted) in `ListTicketsOutput`; `CreateTicketInput.assigneeBotId` optional. Verify: contract
  tests parse an old list response and a create without an owner.
- [x] 2.3 `listTicketCards` in `packages/db/src/board.ts` (three queries for any number of
  tickets). Verify: Postgres test for latest comment, empty-body comments skipped, working Nurling
  (owner first), file count equal to `listTicketFiles` length, tenant context, and another Space's
  rows not counted.
- [x] 2.4 `tickets.list` merges the card fields. Verify: router test that the fields come back and
  the query count does not grow with the number of tickets.
- [x] 2.5 `createTicket`: no owner from a user → Chief (`onboarding:first`, not archived, same user
  and space) with `ticketTriagePrompt`, or unassigned when there is none; Nurling-created tickets
  unchanged; router `create` checks the owner only when given. Verify: unit tests for each case and
  that the wake carries the triage prompt.
- [x] 2.6 `createTicketChangeNotifier` sends the board event after the wakes, also when a wake
  throws. Verify: unit test of the order and of the failure path.

## 3. Web board

- [x] 3.1 `use-mention-input.ts` lifted from `ReplyBox`; `MentionPicker` `side` prop. Verify:
  existing `TicketModal` tests pass unchanged; quick-add tests drive the shared hook.
- [x] 3.2 `quick-add.ts` and `QuickAdd.tsx`. Verify: unit tests for one line, several lines, a
  long first line, owner by mention (token removed), a deleted mention, empty text, Enter and
  Shift+Enter, and the create call.
- [x] 3.3 `columns.ts`: filter, grouping, Done recent/older split, counts. Verify: unit tests.
- [x] 3.4 `BoardCard.tsx`: ref, Needs you, title, shimmer or last comment, footer, file count,
  Approve, opening the modal, Move to menu. Verify: component tests for each state, and that
  Approve does not open the modal.
- [x] 3.5 `BoardColumn.tsx` and drag and drop with optimistic move and revert. Verify: component
  tests firing drag events, and a refused move restoring the card and showing the error.
- [x] 3.6 `NurlingFilter.tsx`, the header in `BoardView.tsx` and the responsive layout. Verify: component test of
  the filter; e2e checks below.
- [x] 3.7 `BoardView.tsx` with live updates and the working-set reload; `Board.tsx` swaps to it,
  upstream board kept as `UpstreamBoardPage`. Verify: `BoardView` tests; `Board.test.tsx` still
  passes against `UpstreamBoardPage`; typecheck and lint clean.
- [x] 3.8 Rewrite `apps/web/e2e/board.spec.ts` for quick-add, filter, move menu and approve, with
  screenshots at 1440 and 390 px and a no-page-sideways-scroll check at 390, 834 and 1440 px.
  Verify: passes locally against Postgres 16; CI e2e job green; screenshots linked on the PR.

## 4. Ship

- [x] 4.1 `pnpm` typecheck, lint, unit tests for changed packages; `openspec validate board-overhaul
  --strict`. Verify: all pass locally.
- [x] 4.2 PR `feature/board-overhaul` with Why/What/Testing, the copy table, and the CI screenshot
  links. Verify: CI green, review comments handled.
- [x] 4.3 Archive the change after merge. Verify: `openspec archive board-overhaul` and the main
  spec updated.
