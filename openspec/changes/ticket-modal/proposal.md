# Proposal

## Why

Opening a ticket on the Board shows a small form dialog: title, description, owner, status and
priority selects, a Save button, and under it a flat comment list. It reads like a settings
screen, not like a piece of work someone is doing.

- You cannot see what happened on a ticket. Status changes leave no trace, so "who moved this to
  Blocked, and when?" has no answer.
- Replying to a Nurling does nothing. A comment you write is stored, but the Nurling that owns the
  ticket is not woken, so it only notices when something else wakes it. Asking it a question on the
  ticket feels like talking to a wall.
- When a Nurling is stuck on you, it can send an ask card in chat, but the ticket itself says
  nothing. Someone opening the board sees a card in Blocked with no reason.
- Files a Nurling produced for a ticket are only reachable from the chat it was working in.

This change turns the dialog into a two-pane ticket view: the work on the left, the conversation
on the right, and makes replying actually reach the Nurling.

## What Changes

### The modal (web and desktop)

- A new large modal replaces the ticket dialog for **existing** tickets.
  - **Left pane:** large title; a properties row (status pill, owner, priority); description;
    files.
  - **Right pane:** the activity feed (status changes as small grey lines, comments as cards,
    newest at the bottom) and a reply box.
- Clicking the status pill changes the status. Owner and priority change in place. Title and
  description edit in place and save when you leave the field (the old dialog allowed this, so it
  must not be lost).
- The feed updates live while the modal is open, from the existing board events.
- Every Nurling (owner, comment author) renders with the existing `BotAvatar`, including its
  idle/working state from the bot's run status. A user shows their profile picture, falling back to
  their initial.
- **Files** lists what the owning Nurling attached with `attach_file` while working on the ticket.
  The section is hidden when there are none.
- "New ticket" keeps the current small create dialog. Nothing in the mockup covers creation.

### Replying wakes the owner

- A comment from a user on an open ticket (status not `done`/`closed`) wakes the assignee Nurling.
  Today `commentTicket` always passes `wakeAssignee: false`.
- Comments from a Nurling wake nobody.
- The wake prompt tells the Nurling to read the new comments with `ticket_get`.

### Ticket run guidance

- When a Nurling is blocked on the user, its guidance now says: comment the question on the ticket,
  set the ticket to Blocked, and still send its normal ask card.
- The guidance also says: anything the user should see or download (reports, CSVs, documents) is
  attached with `attach_file`; scratch and working files are not. Files only written to the
  workspace are not listed, because they are not artifacts.
- Both are prompt changes only.

### Backend, minimal and additive

- **Ticket events**: one new table `ticket_events` (created, status changed, owner changed) written
  by the existing create/update paths, and one new read-only RPC `tickets.events`. Without it the
  feed cannot show status changes, because nothing records them today. A second read-only RPC,
  `tickets.files`, lists the attached files and returns the existing artifact shape.
- **Ticket link on tasks**: one nullable `ticketId` column on `tasks`, set by the ticket wake.
  It lets the modal list the files a Nurling produced for the ticket (artifacts of runs of those
  tasks) without a new file store. Change 2 reuses it for mention wakes and loop guards.
- Both are new tables/columns only, so the previous release keeps working during the deploy.
- Existing contracts (`tickets.get/update/comment/comments`) and the board event stream are reused
  unchanged.

### Mobile

Mobile has **no board screen**: `apps/mobile` has no route or component for tickets, only a
comment in `lib/api.ts`. Mobile is left out of this change. It still benefits from the wake and
blocked behaviour, since those are server-side.

### Proposed copy

Every visible word is UI. New copy, and what I propose to drop from the mockup:

| Copy | Where | Verdict |
|---|---|---|
| `Files` | heading above produced files | keep: the only label that tells files apart from the description; section hidden when empty |
| `Reply` | reply box accessible name and placeholder | keep: it is the only text on an otherwise blank input |
| `{actor} created this and assigned it to {owner}` | first feed line | keep: it is the feed's start and the only record of the creator |
| `{actor} moved it to {status}` | status-change line | keep: this is the history the change exists for |
| `{actor} assigned it to {owner}` | owner-change line | keep: ownership is part of the story |
| `You` | actor name for the signed-in user | keep |
| Status, Owner, Priority, Description, Board | labels | already exist in the app, reused |
| `Activity` heading | right pane | **drop**: the feed is self-evident next to the reply box |
| `Created by you · Oct 24` header | top bar | **drop**: the first feed line says it |
| `Due` / `Add date` | properties row | **drop**: tickets have no due date |
| `…` menu | top bar | **drop**: nothing to put in it |
| `Reply, or @ a Nurling for help` | placeholder | **drop**: the `@` part belongs to change 2 |

### Upstream merge safety

New components under `apps/web/src/components/board/TicketModal/`. Edits to existing upstream
files are small:

| File | Edit |
|---|---|
| `apps/web/src/pages/Board.tsx` | open the new modal instead of `TicketDialog` for an existing ticket (a few lines); `TicketDialog` stays for "New ticket" |
| `apps/web/e2e/board.spec.ts` | the existing detail assertions move to the modal |
| `packages/adapters/src/ticket-tools.ts` | `commentTicket` decides `wakeAssignee`; `createTicket`/`updateTicket` record events |
| `packages/adapters/src/ticket-wake.ts` | wake prompt text, set `ticketId` on the task |
| `packages/adapters/src/executor.ts` | one guidance string |
| `packages/db/prisma/schema.prisma` | `TicketEvent` model, `Task.ticketId` |
| `packages/contracts/src/{board,rpc}.ts` | `TicketEvent` schema, `tickets.events` and `tickets.files` |
| `apps/api/src/router.ts` | the `tickets.events` and `tickets.files` handlers (next to `tickets.comments`) |

Everything else is new files. `Board.tsx` is not rewritten. `TicketDialog` keeps its
edit-an-existing-ticket branches although only "New ticket" reaches it now; pruning them is left for
after the next upstream sync so this diff stays small.

### Not changed, on purpose

- No mobile screen, no mentions (change 2), no due dates, no user file uploads on comments.
- No change to board columns, the card UI, or `tickets.list`.

## Decisions I need from you

1. **Status history storage.** Recommended: the `ticket_events` table above. The alternative is
   showing comments only, which drops the status lines from your mockup.
2. **Files.** Decided: only files the Nurling attached with `attach_file` (via the task link), with a guidance line telling it to attach deliverables and not scratch files. The mockup's
   "attachments" need a way to attach a file to a ticket, which does not exist; adding it means a
   new upload path and storage link. I suggest a follow-up change if you want it.
3. **Old tickets.** They have no recorded history, so the feed shows only a synthesised
   "created" line from `createdAt`, then their comments. Their past status changes are lost for
   good.

## Impact

- Capability: new `board-tickets` spec.
- Prisma migration: one new table and one new nullable column, both additive.
- API: two new read-only RPCs, `tickets.events` and `tickets.files`.
- Behaviour change: user comments now start a Nurling run, which costs model usage. Bounded by
  one run per user comment on an open ticket.
- Contacts no Rakazo-owned infrastructure.
