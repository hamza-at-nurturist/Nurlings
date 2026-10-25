# Design

## Evidence

- `commentTicket` wakes the owner for a user's comment (`wakeAssignee: !input.botId && ...`) and
  never changes the ticket's status. `updateTicket` locks the ticket row, changes fields and
  records `status` events in one transaction.
- `ticket_events.kind` is a text column; today `created | status | owner`. The feed renders a line
  per kind in `ActivityFeed.eventLine`.
- Statuses are `todo | doing | review | blocked | done | closed` (labels: To do, In progress,
  In review, Blocked, Done, Won't do). `done` and `closed` stamp `completedAt`.
- A Nurling's comment already carries `mentions` including `{ kind: "user" }` when it called for
  the user (previous change), and `mention_user` already pushes. A Nurling blocked on the user is
  told to comment and set Blocked (`TICKET_SILENT_REPLY_GUIDANCE`).
- `GET tickets.list` returns `TicketSchema` rows with no per-ticket comment data.

## Decisions

### Approval is its own event kind and its own RPC

`tickets.approve` refuses unless the ticket is In review, under the row lock, so a stale button
cannot close a ticket the Nurling has just reopened. It records an `approved` event instead of a
`status` event, so the feed can say "You approved it" without storing the previous status. Alternative:
`tickets.update({ status: "done" })` and infer "approved" from the previous event, which breaks as soon
as one status is skipped. A dedicated RPC also keeps "approve" out of the Nurling tool surface.

### The reply move lives in `commentTicket`

When the comment has no `botId` and the ticket is In review or Blocked, the same transaction sets
`doing` and records a `status` event for the user. The existing wake follows unchanged. Doing it in
the server function (not the modal) makes it hold for every client. Any user comment counts, including
one that only mentions another Nurling; narrowing it would need a judgment about what a reply means.

### Needs you is a stored flag

`tickets.needsUser` is set to "this comment is a Nurling's and mentions the user" on every comment
in the same transaction, so a user reply or a Nurling's next plain comment clears it with no extra
rule. The DTO masks it for Done and Won't do. Alternative: derive it from the latest comment on every
list call, which needs a per-ticket latest-comment query on each board load.

### Needs you comes from `mention_user`, not from text

The server reads the structured mention that already exists. Parsing a question out of free text is
what AGENTS.md tells us not to do. The only prompt-side change is the `mention_user` tool
description. A Nurling that is Blocked but never sets `mention_user` simply shows no badge.

## Risks

- A Nurling blocked on the user that forgets `mention_user` shows no badge. It still shows Blocked.
- A user who changes a Blocked ticket's status by hand keeps the badge until they reply or the
  Nurling comments again.
