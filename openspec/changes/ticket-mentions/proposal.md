# Proposal

## Why

Replying on a ticket reaches only its owner. If the owner is stuck on something another Nurling is
better at, or you want a second opinion from a different Nurling, there is no way to ask on the
ticket: you would leave the ticket, open another chat and paste context. Nurlings cannot ask each
other for help on a ticket either, and a Nurling that needs you has no way to say "this is for you"
that reaches your phone.

This change lets anyone on a ticket call in another Nurling by name, keeps the ticket as the one place
the conversation happens, and tells you when a Nurling is asking for you.

## What Changes

### Mentioning from the reply box (web and desktop)

- Typing `@` in the reply box opens a picker of the space's Nurlings, in the same style as the chat
  composer's picker (same keyboard handling, `BotAvatar` per option). Choosing one adds a name chip
  above the box and `@Name` to the text.
- In the feed, a mention renders as a name chip. A Nurling's chip uses that Nurling's own color: the
  `#hex` part of its `color` (before `::`), as a tinted background with the name in full color. If
  the color is not a hex value the chip is neutral. A user mention stays neutral.
- A comment that has mentions renders as plain text with its chips; comments without mentions still
  render as markdown.

### Waking the mentioned Nurling

- A user's comment that mentions a Nurling that is **not the owner** wakes that Nurling for this
  ticket only: it reads the ticket, replies with **one** comment, and does not change the ticket's
  status or owner. This is enforced in the ticket tools, not only by the prompt: in such a run
  `ticket_update` is refused when it changes the status or owner, and a second `ticket_comment` on
  the ticket is refused. The tools find the run's task themselves, so `executor.ts` carries no
  enforcement.
- Mentioning the owner needs nothing new: a user's comment already wakes the owner.
- One owner per ticket stays. No groups, no multi-assign.

### Nurlings mentioning each other

- `ticket_comment` gains optional `mention_bots` (bot ids from the teammate list) and
  `mention_user` (true). The owner, or any woken Nurling, can ask another Nurling for help the same
  way a user does. The comment text carries `@Name` so the chip renders.
- A non-owner Nurling that mentions the owner wakes it with the normal ticket wake.
- Loop guards for a wake started by a Nurling's mention:
  - It never wakes a Nurling that is already working on this ticket (a queued, leased or running run of
    a task for this ticket).
  - It never wakes the commenting Nurling itself.
  - At most **10** such wakes per ticket per rolling hour. Beyond that the comment is stored and the
    mention is ignored.
  - A user's own mentions skip the working guard and the cap, because a person cannot loop.
  A wake still coalesces with a queued one, as for owner wakes.
- Only Nurlings of the same user in the same space can be woken, and not archived ones, like
  assignment today.

### A Nurling mentioning the user

- `mention_user` on a Nurling's comment sends the user a notification through the existing
  notification provider (the push channel). Its title names the Nurling and the ticket, its body is
  the start of the comment. It follows the Nurling's existing "notify on finish" setting, so there is
  still one control. The mention chip shows in the feed for everyone.

### Backend, additive only

- `ticket_comments.mentions`: JSON list of `{ kind: "bot" | "user", id }`, default empty. Names and
  colors are resolved by the client from the bots it already has, so a rename follows.
- `tasks.ticketWake`: nullable text, `"mention"` (a user asked) or `"bot_mention"` (a Nurling asked).
  The loop cap and the comment-only run rules read it. `ticketId` from the previous change already
  links a task to its ticket.
- `CommentTicketInput` gains optional `mentions`; `TicketComment` gains `mentions`. Both are
  optional with empty defaults, so existing clients keep working.

### Mobile

Mobile still has no board screen, so there is no picker there. Wakes and notifications are
server-side and need no mobile change.

### Proposed copy

None new. The reply box keeps `Reply`; chips reuse the existing `Remove mention {name}` label. The
notification text is new copy on the push channel, quoted here:

| Copy | Where | Verdict |
|---|---|---|
| `{Nurling} mentioned you on {ref}` | push title | keep: it is the only thing that says why you were pinged |
| first 140 characters of the comment | push body | keep: lets you decide without opening it |

`or @ a Nurling for help` is **not** added back to the placeholder: the chat composer teaches `@` by
doing, and the picker appears on the first `@`.

### Upstream merge safety

New files wherever possible (`TicketModal/MentionPicker.tsx`, `TicketModal/MentionText.tsx`,
`packages/adapters/src/ticket-mentions.ts`, which also holds the comment-only check). Edits to existing files are small:

| File | Edit |
|---|---|
| `packages/db/prisma/schema.prisma` | `TicketComment.mentions`, `Task.ticketWake` |
| `packages/contracts/src/board.ts` | `mentions` on the comment input and output |
| `packages/adapters/src/ticket-tools.ts` | `commentTicket` stores mentions, passes them on and refuses a second comment in a mention run; `updateTicket` refuses status and owner changes in one |
| `packages/adapters/src/ticket-changes.ts` | hands mentions to the new module, sends the user notification |
| `packages/adapters/src/ticket-wake.ts` | optional wake kind, mention prompt, sets `ticketWake` |
| `packages/adapters/src/builtin-tools.ts` | two optional arguments on `ticket_comment` |
| `packages/adapters/src/executor.ts` | two argument lines in the existing `ticket_comment` branch (`mention_bots`, `mention_user`); no enforcement logic |
| `apps/web/src/components/board/TicketModal/{ReplyBox,ActivityFeed}.tsx` | picker and chips (files from the previous change) |

`Board.tsx` is not touched.

### Not changed, on purpose

- No mention of groups, routines, connectors or "everyone" on tickets (the chat composer has them).
- No out-of-app channel for the web app. The web app has no notification path for board events today;
  see the decisions.
- No multi-owner, no reassigning through a mention.

## Decisions (approved)

1. **Mention storage.** Chosen: the `mentions` column plus `@Name` in the text (a Nurling reading
   `ticket_get` sees the name, plain clients degrade to text). Alternative: parse names from the body
   at wake time, which breaks on duplicate or renamed Nurlings.
2. **Chips inside comments.** Chosen: comments with mentions render as plain text with chips, so
   the shared markdown renderer in `packages/chat-ui` is not touched. Alternative: add a mention hook
   to the shared renderer to keep markdown in those comments (a change in a shared upstream package).
3. **Notifying the user.** Chosen: push through the existing provider, honouring the Nurling's
   "notify on finish" setting. Tapping it opens that Nurling's chat, because there is no board link
   target on mobile. The web app has no out-of-app channel for board changes; a browser notification
   for ticket mentions would be a separate change.
4. **Guards.** Chosen: the three rules and the cap of 10 per hour above, with user mentions
   exempt.
5. **Comment-only runs** are enforced in the ticket tools (`ticket-tools.ts` and the new
   `ticket-mentions.ts`), not in `executor.ts`, which is an upstream file. The tools read the run's
   task themselves.

## Impact

- Capability: extends `board-tickets`.
- Prisma migration: one nullable/defaulted column on each of two tables, additive.
- API: `tickets.comment` and `tickets.comments` gain an optional `mentions` field. No new RPC.
- Behaviour change: a mention starts a run of another Nurling, which costs model usage. Bounded by
  the per-ticket cap for Nurling-started wakes and by one run per user mention.
- Contacts no Rakazo-owned infrastructure.
