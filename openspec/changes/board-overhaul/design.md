# Design

## Layout

`apps/web/src/components/board/BoardView/`:

| File | Role |
|---|---|
| `BoardView.tsx` | Page: loads tickets, Nurlings and timezone, follows `boards.subscribe` (moved from `Board.tsx` unchanged), owns filter, selection and the open modal |
| `BoardHeader.tsx` | Back, title, `NurlingFilter`, `QuickAdd`; the container-query layout |
| `NurlingFilter.tsx` | `ToggleGroup` with "All" and one `BotAvatar` item per Nurling |
| `QuickAdd.tsx` | The input, the `@` picker, submit |
| `quick-add.ts` | Pure: text + picked Nurlings → `{ title, description, assigneeBotId? }` |
| `BoardColumn.tsx` | Dot, name, count, "Your turn", drop target, "Show N older" |
| `BoardCard.tsx` | One card, drag source, "Move to" menu, Approve |
| `columns.ts` | Pure: tickets + filter + now → six columns, Done split into recent and older |
| `use-mention-input.ts` | The `@` token, options, highlight, picks: lifted out of `ReplyBox` so both use one copy |

Tests sit next to each file. `TicketModal/*` is reused as is, except `MentionPicker` gains a
`side` prop (`"above"` default, `"below"` for the header) and `ReplyBox` uses the shared hook.

## Decisions

### 1. `Board.tsx` keeps upstream's code, `BoardPage` swaps

`BoardPage` becomes `return <BoardView />`. Upstream's inline board and `TicketDialog` stay in the
file, renamed `UpstreamBoardPage` and exported (so lint sees no dead code), and `Board.test.tsx`
keeps testing it under that name. The diff to `Board.tsx` is a few lines, and later upstream edits
to its board still merge into the renamed function without conflicts; when an upstream sync brings
something worth having, it is ported into `BoardView`.

Alternative: delete the old code. Cleaner file, but every upstream edit to `Board.tsx` becomes a
conflict. Recommended: keep it.

### 2. Card fields: additive fields on `tickets.list`, three batched queries

`ListTicketsOutput.tickets` becomes `TicketListItemSchema = TicketSchema.extend({...})`:

- `lastComment: string | null` (default null): the newest comment with text, cut to 280
  characters, as plain text. The card clamps it to two lines with CSS.
- `fileCount: number` (default 0): the same files `tickets.files` lists (newest version of each
  family, from the ticket's runs and the user's comment uploads), counted.
- `workingBotId: string | null` (default null): a Nurling with a queued, leased or running run for
  the ticket, the owner first.

Only the list carries them; `get`, `create`, `update` and the rest still return `Ticket`, so no
response carries a misleading zero. Defaults let an older server's response parse.

`packages/db/src/board.ts` adds `listTicketCards(prisma, { spaceId, userId, ticketIds })`, three
queries for the whole board, whatever its size:

1. Latest comment per ticket: `SELECT DISTINCT ON ("ticketId") ... ORDER BY "ticketId",
   "createdAt" DESC, id DESC` over `ticket_comments` with `body <> ''` (uses the existing
   `(ticketId, createdAt)` index).
2. Working: `run.findMany` where `status in (queued, leased, running)` and
   `task.ticketId in ids`, selecting `botId` and the task's `ticketId`. Bounded by active runs.
3. Files: one grouped `count(DISTINCT COALESCE("rootArtifactId", id))` over the union of artifacts
   from the tickets' runs and artifacts named by their comments' attachments, scoped to the space
   and user like `listTicketFiles`.

The router calls it once after the tickets query and merges by id. A Postgres test checks the
count equals `listTicketFiles(...).length`, runs it in a tenant context, and checks another
Space's rows never count.

`runs.taskId` and `artifacts.runId` have no index today, so query 3 (and the existing
`tickets.files`) scan. Two migrations add `CREATE INDEX CONCURRENTLY` on each, one statement per
migration as in `20260825140001_runs_routineid_idx_concurrent`. Additive; the previous release
does not notice them.

Alternative: a separate `tickets.cards({ ids })` RPC. One more request per reload and a second
list to keep in sync; no gain.

### 3. Freshness of "working"

The board already reloads the list on every board event and on the 20-second heartbeat. Two
small changes keep the shimmer honest:

- `createTicketChangeNotifier` sends the board event after the wakes (in a `finally`), so the
  reload that follows a create, reassign or reply sees the queued run.
- `BoardView` uses the existing `useLiveBots` poll (every 4 s while a Nurling works) and reloads
  the list when the set of working Nurlings changes, which catches a run finishing without a
  ticket change and runs started by date reminders.

### 4. Quick-add and Chief

Client (`quick-add.ts`): split on the first newline; title is the first line trimmed and cut to
`TICKET_TITLE_MAX_LENGTH` (when cut, the full text goes to the description); the description is
the rest, trimmed, omitted when empty. The owner is the first picked Nurling whose `@Name` is
still in the text; that one token is removed and spaces collapsed. Other `@Name`s stay as text.
Nothing is sent when the title is empty.

Server: `CreateTicketInput.assigneeBotId` becomes optional. The Nurling tool path is unchanged
(`ownerBotId ?? botId` always sets one). In `createTicket`, when a user gives no owner:

- Find Chief: the user's non-archived Nurling in the space with `spawnKey = "onboarding:first"`.
- Found: assign it and wake it with `ticketTriagePrompt(ref)`: "Ticket {ref} came in from the
  user without an owner. Read it with ticket_get. If another Nurling is a better fit, reassign it
  with ticket_update; otherwise work on it yourself." The usual run guidance still applies.
- Not found: create it unassigned, no wake.

`TicketChange` gains an optional `wakePrompt`, passed to `wakeTicketAssignee`'s existing
`prompt`. The `created` event records Chief as owner; a later reassignment records its own
`owner` event and wakes the new owner as today.

The router's `create` handler checks `repos.getBot` only when an owner is given.

### 5. Columns

`columns.ts` is pure and unit tested. Filter first (by `assigneeBotId`; unassigned tickets show
only under All), then group by status in `TICKET_STATUSES` order, keeping the list's
`updatedAt desc` order. Done is split by `completedAt >= now - 7 days`; a Done ticket without
`completedAt` counts as recent. The count shows what the column holds after filtering, older Done
included. "Show N older" reveals them until the board reloads from scratch.

Dots use tokens: To do `muted-foreground`, In progress `status-working`, In review `warning`,
Blocked `destructive`, Done `success`, Won't do `faint-foreground`. In review is tinted
`bg-warning/5`; "Your turn" is a `Badge` in warning colours, shown only while the column has
cards. Done and Won't do cards are dimmed as in the mockup.

### 6. Cards

The card is an `article` with one stretched `button` over its title that opens the modal (the
accessible name is the title), and two controls above it: the "Move to" `DropdownMenu` trigger
(icon, shown on hover and focus, always on coarse pointers) and, for In review, Approve. No nested
interactive elements.

- Working line: `Shimmer` from `components/ai/primitives` with "{name} is working…", using the
  working Nurling's name.
- Otherwise `lastComment`, `line-clamp-2`, plain text. Nothing when there is none.
- Footer: owner `BotAvatar` at 16 px with `status="running"` while working, the owner's name,
  `CardDates`, and a paperclip with `fileCount` when above zero.
- Approve calls `tickets.approve`, then reloads; a refusal shows the board's error line and
  reloads.

### 7. Drag and drop

Native HTML5: the card sets `draggable`, `dataTransfer` carries the ticket id; columns accept
`dragover`/`drop` and highlight while hovered. A drop on another column moves the card at once
(optimistic), calls `tickets.move`, and reloads; a failure reloads and shows the error. Phones and
keyboards use "Move to", a radio list of the six statuses. Native drag works with a mouse on web
and Electron and with touch on iPadOS; elsewhere touch uses the menu. No library.

Alternative: `@dnd-kit/core` for touch dragging and keyboard dragging. A new dependency for a
behaviour the menu already covers; not proposed.

### 8. Responsive

The page root is a Tailwind container (`@container`). Columns are a CSS grid flowing by column,
with `overflow-x-auto` and `snap-x snap-mandatory`, each column `snap-start`:

- default: `grid-auto-columns: minmax(12.5rem, 1fr)`, all six fit at desktop widths;
- below `@max-6xl` (about 1100 px): columns a fixed 16 rem; quick-add wraps to its own full-width
  row;
- below `@max-xl` (about 640 px): header stacks (title row, filter row scrolling sideways with no
  scrollbar, quick-add row); columns `84%` wide with tighter padding so the next one peeks.

Exact breakpoints follow the mockup's 1100 px and 640 px. Each column scrolls vertically on its
own so long columns don't push the page.

## Risks

- **Unassigned tickets**: possible when there is no Chief. The modal already handles no owner
  (owner picker empty, no attach control); assigning one wakes it.
- **List cost**: three extra queries per reload, each bounded by the board's tickets or active
  runs. With the two indexes they stay index lookups.
- **Chief by spawn key**: a user who deleted Chief gets unassigned quick-adds; renaming Chief is
  fine, the key does not change.

## Verification

Unit tests for `quick-add.ts`, `columns.ts`, `BoardCard`, `BoardView` (filter, quick-add calls,
drag, menu, approve) and the backend; a Postgres test for `listTicketCards`. The board e2e is
rewritten for quick-add and captures screenshots at 1440 px and 390 px.
