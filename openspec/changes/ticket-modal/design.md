# Design

## Evidence

- `commentTicket` in `packages/adapters/src/ticket-tools.ts` always calls `onTicketChange` with
  `wakeAssignee: false`, so no comment wakes anyone.
- `wakeTicketAssignee` creates a `Task` plus a `Run` with `trigger: "tickets"` and returns early for
  `done`/`closed` tickets. It does not record which ticket the task belongs to; the ticket only
  appears inside the prompt text.
- A ticket row keeps only its current `status`, `completedAt` and `assigneeBotId`. No table records
  who changed what, or when.
- `Artifact` has `runId` and `botId` but no ticket link. A run belongs to a `Task`.
- `Bot.status` (a run status string) already drives the working animation of `BotAvatar` in the
  sidebar roster.
- The web Board page refetches `tickets.list` and bumps a per-ticket counter on every board event,
  which the old dialog used to refetch comments.

## Decisions

### Status history: a small event table (chosen)

`ticket_events(id, ticketId, spaceId, kind, actorBotId, actorUserId, status, assigneeBotId,
createdAt)`, `kind` one of `created | status | owner`. Written inside the same transaction as the
ticket write in `createTicket` and `updateTicket`, so the history cannot drift from the ticket.
`tickets.events` returns them oldest first. No backfill: older tickets get a synthesised `created`
line on the client from `createdAt` and `createdBy*`.

Alternative rejected: derive from `updatedAt`. It holds one timestamp, not a history.

### Feed merge on the client

The modal fetches `tickets.events` and `tickets.comments`, merges by `createdAt` (ties: event
before comment, then id) and refetches both when a board event for this ticket arrives. It opens
its own `boards.subscribe` stream rather than editing `Board.tsx`, so the page diff stays a few
lines.

### Which files belong to a ticket: task link (chosen)

`Task.ticketId` is set by `wakeTicketAssignee`. Files = artifacts whose `runId` is a run of a task
with this `ticketId`, latest version of each family. Only `attach_file` and media generation create
artifacts; `write_file` and `shell` only touch the workspace, so a deliverable shows up only when the
Nurling attaches it. The ticket guidance says to attach reports, CSVs and documents the user should
see or download, and not scratch files. In ticket runs the chat message of an attachment is already
dropped (background run), so nothing reaches the transcript. Needs no new file store and works for change
2's mention wakes.

Alternative rejected: match by name or by ticket ref in the prompt. Fragile and unreviewable.

### Wake on comment

`commentTicket` computes `wakeAssignee` as: author is a user (`userId` set, `botId` unset), ticket
has an assignee, and the status is not done/closed. `wakeTicketAssignee` already re-checks the
status. If the author is a Nurling, nothing wakes, so two Nurlings cannot loop through comments.

A user posting several comments quickly queues several runs. To avoid duplicates, the wake is
skipped when a **queued** (not yet started) ticket run already exists for the same ticket and bot;
that run will read all comments when it starts. A **running** run does not suppress the wake,
because it may already have read the ticket.

The wake prompt becomes: work on ticket X, read it with `ticket_get`, and read any comments added
since you last looked. Existing wording about keeping progress in comments and using
`ticket_update` stays.

### Ticket run guidance

Two sentences are added to `TICKET_SILENT_REPLY_GUIDANCE`: when blocked on the user, post the
question as a ticket comment, set the ticket to Blocked, and still send the ask or approval card;
and attach anything the user should see or download (reports, CSVs, documents) with `attach_file`,
not scratch or working files. Tests assert the guidance contains the instructions. They do not
judge the model's behaviour.

### Avatars

The modal imports `BotAvatar` from `@rakazo/ui-web` and passes `color`, `identity` (bot id) and
`status` from `bots.list`, exactly like the roster. No new avatar component. Users: the signed-in
user's `session.user.image`, falling back to their initial. For another member's comment, the
initial (no member picture is available to the client today).

### Components

`TicketModal/` holds `TicketModal.tsx` (shell, two panes), `Properties.tsx`, `ActivityFeed.tsx`,
`ReplyBox.tsx`, `TicketFiles.tsx` and `use-ticket-activity.ts`; there is no avatar component of
its own. It uses shadcn `Dialog`, `Popover`/`DropdownMenu` and `Textarea` from `@rakazo/ui-web`
and semantic tokens only. Status pill colors use the existing status/warning/success tokens.

## Risks

- Cost of user-triggered wakes. Bounded by the queued-run dedupe.
- A migration with a new table and column: additive, safe during the side-by-side deploy window.
- E2E: the modal needs a seeded Nurling comment to show a card; the test posts a user comment
  through the UI and asserts the feed and the pill, which is deterministic and offline.
