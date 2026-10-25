# Proposal

## Why

A Nurling that finishes a ticket moves it to In review, and then nothing tells you what to do next.
Closing it means opening a status menu and picking Done; asking for changes means writing a reply
and also remembering to move the ticket back, or the Nurling's board shows it as finished while it
is reworking it. A Nurling that is stuck on you comments a question and sets Blocked, but on a
busy board nothing on the card says it is waiting for you rather than for something else.

This change makes the three moments one action each: approve it, reply to change it, answer it.

## What Changes

### Approve (web and desktop)

- A ticket that is In review shows one **Approve** button in the modal header. It moves the ticket
  to Done and records "You approved it" in the activity feed.
- There is no reject button. The status menu and card dragging keep working as before.
- Approving is a user action only. No Nurling tool can approve.

### A reply sends it back

- A user's comment on a ticket that is In review or Blocked moves it to In progress, records that
  move in the feed (as the actor's usual "moved it to In progress" line), and wakes the owner as
  replies already do. The comment, the move and the wake happen together on the server, so a
  client cannot send the comment and forget the move.
- A Nurling's own comments never move a ticket.

### Needs you

- When a Nurling's latest comment on a ticket calls for the user (`mention_user`), the ticket
  shows a small **Needs you** badge on its card and in the modal. It clears when the user replies,
  when the Nurling's next comment does not call for the user, and while the ticket is Done or
  Won't do.
- The `ticket_comment` tool's `mention_user` description tells a Nurling to use it when it needs
  the user's answer or decision. That is what raises the badge; no text is parsed.

### Backend, additive only

- `tickets.needsUser`: boolean, default false, set by `commentTicket` in the same transaction as
  the comment.
- `ticket_events.kind` (text) gains the value `approved`. `TicketEventKind` gains it.
- `tickets.approve({ id })` RPC and an `approveTicket` function in a new `ticket-approve.ts`: under
  the ticket row lock, refuses unless the ticket is In review, then sets Done, stamps completion and
  records the `approved` event.
- `Ticket` gains `needsUser` (false when the ticket is Done or Won't do).

### Mobile

Mobile has no board screen, so nothing changes there. The server rules apply to every client.

### Proposed copy

| Copy | Where | Verdict |
|---|---|---|
| `Approve` | modal header button, only while In review | keep: it is the single action the state calls for; an icon alone would not say what it does |
| `Needs you` | badge on the card and in the modal header | keep: it is the only signal that the ticket waits on you; it shows only while true |
| `{actor} approved it` | activity line | keep: the history must say who closed the ticket and that it was a review decision, which "moved it to Done" does not |

The reply move reuses `{actor} moved it to {status}`. No explainer text, no confirmation dialog.

### Upstream merge safety

New files: `packages/adapters/src/ticket-approve.ts`, `TicketModal/ApproveButton.tsx`,
`TicketModal/NeedsYou.tsx`. Small edits to existing files:

| File | Edit |
|---|---|
| `packages/db/prisma/schema.prisma` + one migration | `Ticket.needsUser` |
| `packages/db/src/board.ts` | `needsUser` in `toTicketDto`; `approved` event kind |
| `packages/contracts/src/board.ts`, `rpc.ts` | `needsUser`, `approved` kind, `ApproveTicketInput`, `tickets.approve` |
| `packages/adapters/src/ticket-tools.ts` | `commentTicket` locks the ticket, applies the reply move, sets `needsUser` |
| `packages/adapters/src/builtin-tools.ts` | `mention_user` description only |
| `apps/api/src/router.ts` | one `approve` handler |
| `apps/web/src/components/board/TicketModal/{TicketModal,ActivityFeed}.tsx` | button, badge, one event line |
| `apps/web/src/pages/Board.tsx` | one badge on the card |

`executor.ts` is not touched.

### Not changed, on purpose

- No reject button, no "request changes" form: replying is the request.
- No new notification for approval or for Needs you; the push on `mention_user` already exists.
- Dragging a card or using the status menu is unchanged and does not log "approved".

## Impact

- Capability: extends `board-tickets`.
- Prisma migration: one defaulted boolean column on `tickets`, additive.
- API: one new RPC, `tickets.approve`; `Ticket` gains `needsUser`; the event kind enum gains
  `approved`. An old client that does not know `approved` would drop that event line.
- Behaviour change: a user reply on an In review or Blocked ticket now changes its status.
- Contacts no Rakazo-owned infrastructure.
