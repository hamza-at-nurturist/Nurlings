# Design

## File lines come from the files list, not stored events

`tickets.files` already returns the newest version of each file, with `createdAt`, and tells a
Nurling's file (`runId` set) from a user's (`runId` null), the same test the Files list uses for
its "You" label. The feed merges those as a third item kind. A user upload's artifact exists just
before its comment, so its line lands just above the comment.

Trade-off: a file replaced by a newer version of the same name shows once, at the newer time,
because older versions are not listed. A stored `file` event would keep every version but needs a
migration and a write path in the attach tool for little gain.

## Ticket-scoped run state: `tickets.runs`

`useLiveBots` marks a Nurling as working for any run, including chat; showing "is working…" from
that would be wrong on a ticket. `tickets.runs({ ticketId })` returns, per Nurling, its latest run
whose task has this `ticketId`: `{ botId, status, finishedAt }`. The modal loads it with the
other activity, and polls every 4 s only while one is queued, leased or running (the cadence and
gating of `useLiveBots`, which stays the avatar's poll). A run shows as failed only when it is
that Nurling's latest ticket run and its status is `failed`; a retry replaces it. Cancelled runs
show nothing.

## Automatic move: new event kind `resumed`

A status event with no actor is ambiguous with a deleted user (actor set null on delete). A distinct
`resumed` kind keeps "Moved back to {status}" unambiguous and costs nothing: `kind` is a string
column and `TICKET_EVENT_KINDS` gains a value. `commentTicket` records `resumed` instead of
`status` when a reply sends the ticket back, with no actor.

## Time separators

Chat's rule (new day or 15+ minutes) and `TimeSeparator` are reused unchanged, not forked to 30
minutes, so the two surfaces read the same. `TimeSeparator` moves nowhere; the modal imports it
from the shell's chat context.

## Full screen

A boolean in `localStorage` under one key, read lazily and written on toggle, both in try/catch.
The dialog content switches between its current sizing and `h-dvh w-dvw max-w-none` (no rounding).
