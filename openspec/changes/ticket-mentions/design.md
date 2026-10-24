# Design

## Evidence

- `ReplyBox` (previous change) posts `{ ticketId, body }` through `tickets.comment`. A comment has
  `authorBotId`/`authorUserId`; a Nurling's comment carries its owner's user id as well, so "a
  Nurling's comment" means `botId` is set.
- `commentTicket` wakes only the ticket's assignee, through `TicketChange.wakeAssignee` and
  `wakeTicketAssignee`, which creates a task and a `tickets` run, skips done/closed tickets and
  coalesces with a queued run of the same bot and ticket. The task is linked by `tasks.ticketId`.
- `tickets` is a background run trigger: its transcript stays out of chat, but `ask` and `help`
  notifications still go through `notifyRun`, which sends through the `NotificationProvider` and
  honours `bot.notifyOnFinish`.
- The chat composer already has a mention picker (`apps/web/src/pages/shell/composer.tsx`) with
  helpers in `@rakazo/core` (`mentionChipKey`, `stripMentionToken`) and `MentionOptionIcon` /
  `MentionChipIcon` built on `BotAvatar`.
- `ChatMarkdown` has a fixed set of components and no hook for inline chips.
- `message_bot` already limits bot-to-bot chains with a hop budget, but a ticket mention has no hop
  to carry, so the ticket itself is the unit that is bounded.
- `Bot.color` is `#hex` optionally followed by `::shape_N`, or an uploaded `data:image/` value, or
  an older named color. `parseBotAvatar` splits it.

## Decisions

### Mentions are stored beside the text

`ticket_comments.mentions` holds `[{ kind, id }]`. The body keeps `@Name`. The server validates
every bot id (same space, same user, not archived) and drops the rest, so a stale or forged id
neither wakes nor renders. The user kind is always the commenting Nurling's own user, whatever id was
sent.

The client turns a comment into text and chips by finding `@Name` for each mention's current name
(case-insensitive, whole token). A mention whose name is not in the text still wakes and notifies; it
simply has no chip.

### The wake path

`commentTicket` computes the set of bots to wake and passes it on `TicketChange.mentionBotIds`.
`ticket-changes.ts` calls a new `wakeMentionedBot` (in `ticket-mentions.ts`, which leaves
`ticket-wake.ts` alone apart from exporting the owner's prompt) per bot, serialised per ticket with a row
lock so the cap and the working check cannot be raced past:

1. Skip the commenting bot itself.
2. If the bot is the owner: for a user's mention nothing (the comment already wakes it); for a
   Nurling's mention a normal ticket run (`ticketWake = bot_mention_owner`), subject to the same guards.
3. Otherwise, in one transaction: ticket still open; bot valid; coalesce with a queued run of the
   bot for this ticket; for a Nurling-started wake, no working run of the bot for this ticket and
   fewer than 10 `bot_mention` tasks for this ticket in the last hour. Then create the task with
   `ticketId` and `ticketWake` and a `tickets` run.

The mention prompt: "You were mentioned on ticket X. You are not its owner. Read it with ticket_get,
reply with one ticket_comment, and do not change its status, owner or other fields."

### Comment-only runs are enforced in the ticket tools

The executor does not hand a run or task id to the ticket tools, and `executor.ts` is an upstream
file we keep free of our logic. So `ticket-mentions.ts` exports `activeMentionTask(prisma, { spaceId,
botId, ticketId })`: the calling bot's task for this ticket with `ticketWake` set and a `leased` or
`running` run, newest first. A Nurling's tool calls only happen inside a run, and a non-owner has no
other run on the ticket at the same time, so a hit means "this call is from a mention wake".

- `updateTicket` (only when `botId` is set): inside the transaction, after reading the current row, if
  the call changes the status or the owner and there is an active mention task for this ticket, it
  returns an error and writes nothing. Other fields and other tickets are unaffected.
- `commentTicket` (only when `botId` is set): if there is an active mention task and the bot has
  already commented on this ticket since that task was created, it returns an error telling the
  Nurling it has replied and should stop.

Alternatives rejected: a check in `executor.ts` (upstream conflicts), and prompt only (the model can
ignore it, and the requirement is a guarantee).

The only `executor.ts` edit is passing the two new `ticket_comment` arguments (`mention_bots`,
`mention_user`) through, two lines in the existing branch.

### The user notification

`ticket-changes.ts` already owns the board notifier. It gains an optional `notifications` provider
and, for `mentionUser`, sends the existing `help` message kind: title `{Nurling} mentioned you on
{ref}`, body the first 140 characters, `botId` and `threadId` of the Nurling. It checks the Nurling's
`notifyOnFinish`, like `notifyRun`. A failure is logged and never fails the comment.

Not done: a browser notification on the web. Browser notifications today follow a subscribed chat
thread, and the Board has no such subscription.

### The picker

`MentionPicker.tsx` is a listbox shown under the reply box when the caret follows an `@` token, filtered
by the typed text, with arrow/enter/escape handling. It reuses `MentionOptionIcon` and the chat
composer's matching rules where they are exported; where they are not, it imports the same
`@rakazo/core` helpers rather than copying them. Chosen mentions show as chips above the box with the
existing remove label. Sending posts `mentions` with the ids still present in the text.

### Chip color

`mentionColor(color)` returns the hex before `::` when it is a `#rgb` or `#rrggbb` value, else
nothing. The chip sets `color` to it and the background to a translucent mix of the same value,
through inline style. This is the one place a color comes from data instead of a token, which the
design allows because Nurlings carry the only identity color. A pale hex can read weakly on a light
background; the requirement is to use the Nurling's color as is.

## Risks

- Cost from Nurling-started wakes: bounded by the guards above.
- Races: two simultaneous mentions of the same bot are serialised by the transaction; the second
  coalesces or is skipped by the working guard.
- Migration: two additive columns.
