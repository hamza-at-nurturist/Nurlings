# Proposal

## Why

The Board is the one screen that shows everything the Nurlings are doing, and today it reads like a
plain list split by status:

- Cards show a ref, a title, dates and an owner name. Nothing says whether a Nurling is working on
  the ticket right now, what happened on it last, or that it has files.
- Nothing points at the column that waits on you. In review tickets only become Done if you open
  each one and approve it.
- Done keeps growing forever, so the board gets longer every week.
- Creating a ticket means a dialog with five fields and picking an owner up front, even when you
  don't know which Nurling should do it.
- You can't filter by Nurling, and you can't move a card without opening it.
- On a narrow window or a phone the columns squash or overflow.

This change turns the board into a place you act from: tell a Nurling what to do in one line, see
who is working, approve from the card, and move cards by dragging.

## What Changes

Web and desktop only (Electron hosts the web UI). The mobile app has no board, so nothing changes
there; the server rules apply to every client.

### Header

Back, "Board", a Nurling filter, and a quick-add box. The "New ticket" button and the old create
dialog go away: quick-add covers creation, and owner, priority and dates are set in the ticket
modal afterwards.

- **Filter**: "All" plus one avatar button per Nurling (`ToggleGroup`, `BotAvatar`). Picking a
  Nurling shows only its tickets. Client-side, not remembered.
- **Quick-add** ("Tell a Nurling what to do…"): Enter creates a ticket, Shift+Enter adds a line.
  The first line is the title, the rest the description. Typing `@` opens the existing
  `MentionPicker`; the first Nurling picked becomes the owner and its `@Name` is taken out of the
  text. With no mention the server assigns Chief, the space's first Nurling, and Chief's wake tells
  it to hand the ticket to the best Nurling or do it itself. Reassigning already wakes the new
  owner. With no Chief the ticket is created unassigned.

### Columns

To do, In progress, In review, Blocked, Done, Won't do, each with a status dot and a count. In
review is lightly tinted and carries a "Your turn" pill while it has tickets. Done shows tickets
completed in the last 7 days and a "Show N older" button for the rest.

### Cards

Ref and Needs you badge; title; then either "{name} is working…" in the AI shimmer while a run for
the ticket is queued, leased or running, or the latest comment, two lines at most. Footer: the
owner's `BotAvatar` (with its working animation) and name, the existing card dates (due red when
overdue and open), and a file count when there are files. In review cards get an Approve button
(existing `tickets.approve`). Clicking a card opens the existing ticket modal.

### Moving cards

Cards drag between columns with native HTML5 drag and drop. Each card also has a "Move to" menu
(`DropdownMenu`) for keyboard and touch. Both call the existing `tickets.move`. **No new
dependency.**

### Responsive

The board measures its own width with container queries:

- Wide: all six columns visible, no sideways scroll.
- Narrower: columns keep a fixed width and scroll sideways with snap.
- Tablet: quick-add drops to its own row under the title.
- Phone: the header stacks (title, a sideways-scrolling filter, quick-add) and columns are about
  84% wide so the next one peeks in.

### Data, without N+1

`tickets.list` gains three fields per ticket, filled by three batched queries for the whole list
(not one per card): `lastComment`, `fileCount` and `workingBotId`. `tickets.create` accepts no
owner from a user. Details in `design.md`.

### Proposed copy

| Copy | Where | Why it is needed |
|---|---|---|
| `Tell a Nurling what to do…` | quick-add placeholder | It is the only label the box has and says it creates work for a Nurling. Hidden once you type. |
| `All` | filter, first button | The way back from a filtered board; avatars alone have no "everyone". |
| `Your turn` | In review column header, only while it has tickets | The single pointer at the column waiting on you; gone when empty. |
| `Show {count} older` | under Done, only when older Done tickets exist | Done is trimmed to a week; without it older work looks lost. Gone once shown. |
| `{name} is working…` | card, only while a run is active | Says live work is happening on that ticket, which no other part of the card does. |
| `Move to` | card menu trigger's accessible name and menu label | The keyboard and touch route to drag; icon-only trigger, so the name is for assistive tech. |

Reused unchanged: status names, `Needs you`, `Approve`, card dates. Removed: `New ticket` (button
and dialog title), `No tickets yet` (empty columns with zero counts and the quick-add box already
say it), the create dialog's field labels.

### Upstream merge safety

New code lives under `apps/web/src/components/board/BoardView/`. Small edits to upstream files:

| File | Edit |
|---|---|
| `apps/web/src/pages/Board.tsx` | `BoardPage` renders `BoardView`; see design decision 1 |
| `packages/contracts/src/board.ts` | `TicketListItemSchema` (defaulted extra fields); `assigneeBotId` optional on create |
| `packages/db/src/board.ts` | one `listTicketCards` helper |
| `packages/adapters/src/ticket-tools.ts` | `createTicket` resolves Chief when a user gives no owner |
| `packages/adapters/src/ticket-wake.ts`, `ticket-changes.ts` | triage prompt; board event sent after the wake |
| `apps/api/src/router.ts` | `tickets.list` merges the card fields; `create` skips the owner check when none is given |
| `packages/db/prisma` | two concurrent index migrations (`runs.taskId`, `artifacts.runId`) |
| `TicketModal/MentionPicker.tsx`, `ReplyBox.tsx` | picker can open below; mention state moves to a shared hook |

What stays internal on purpose: `Chief` is found by the existing `onboarding:first` spawn key, not
a new column or setting, so no schema or upstream onboarding code changes.

## Impact

- Capability: extends `board-tickets`.
- Migrations: two `CREATE INDEX CONCURRENTLY`, additive; the previous release ignores them.
- API: `tickets.list` items gain `lastComment`, `fileCount`, `workingBotId` (defaulted, so an older
  server still parses). `tickets.create` from a user may omit `assigneeBotId`; Nurling tools still
  always set an owner.
- Behaviour: a quick-added ticket with no mention is assigned to Chief with a triage wake, or left
  unassigned when there is no Chief.
- Contacts no Rakazo-owned infrastructure.
