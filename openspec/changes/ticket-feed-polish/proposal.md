# Proposal

## Why

The ticket modal's activity feed is the place a user watches a Nurling work, and today it is
quiet and cramped in the wrong places:

- Files appear only as cards, never as something that happened.
- Every item sits the same distance apart, however far apart in time, and there is no sense of
  "when" beyond a relative time on each row.
- The modal is a fixed size, which is tight for long threads and previews.
- Nothing says a Nurling is working on the ticket, and when its run fails the feed says nothing.
- A user's reply that moves a ticket back to work reads "You moved it to In progress", as if the
  user had done it by hand.
- On a file card the producer ("You" / Nurling name) floats under the card.

## What Changes

Web and desktop ticket modal only (Electron hosts the web UI). Mobile has no ticket modal.

1. **File lines.** The feed logs each ticket file as a small grey line like status events:
   "Runway attached Finance best practices.pdf", "You attached listing-notes.txt". Derived from the
   ticket's files; no new stored event.
2. **Time separators and spacing.** A centered separator ("Today 11:20 AM", "Yesterday 4 PM")
   appears where chat shows one, using chat's `TimeSeparator` and `needsTimeSeparator` (same
   rule as chat: a new day, or 15 minutes or more since the previous item). Items with no
   separator between them sit closer together.
3. **Full screen.** An expand/collapse icon button in the modal header, next to close, makes the
   modal fill the window. The choice is remembered per browser (`localStorage`, guarded).
4. **Working line.** While a Nurling has a queued, leased or running run started for this ticket
   (the owner, or a mentioned Nurling), the bottom of the feed shows "{name} is working…" with the
   existing AI shimmer.
5. **File card meta.** The producer moves into the card's meta line: "Runway · 7.3 KB", "You ·
   22 B". The floating caption goes.
6. **Automatic move.** A reply-triggered move to In progress is recorded without an actor and reads
   "Moved back to In progress". Manual moves keep "{actor} moved it to {status}".
7. **Failed run.** If a Nurling's latest run for the ticket failed, the feed shows "{name}
   couldn't finish, reply to retry" until a newer run exists.

### New copy

Each line is UI, quoted here and justified. All are feed lines in the same grey as existing event
lines; none repeats the interface.

| Copy | Why it is needed | Why not hidden or removed |
|---|---|---|
| "{name} attached {file}" / "You attached {file}" | The feed is the ticket's history; a file arriving is history. | Cards alone do not say who or when for Nurling files. |
| "{name} is working…" | The only live signal on the ticket that a Nurling is acting. | Shown only while a run is active, then gone. |
| "{name} couldn't finish, reply to retry" | A failed run is otherwise silent and the next step is not obvious. | Shown only after a failure, gone once a newer run exists. |
| "Moved back to In progress" | Replaces a misleading "You moved it". | Same slot as an existing line, no extra line. |
| "Today 11:20 AM" style separators | Time context, reused from chat. | Only where there is a real gap. |

Full screen button: icon only, accessible names "Expand" / "Collapse".

## Impact

- Capability: `board-tickets` (modified).
- API: one new read-only procedure `tickets.runs`; one new ticket event kind `resumed`
  (stored as a string column, so no migration). Older web builds render an unknown kind as nothing.
- Web: `apps/web/src/components/board/TicketModal/*`.
- No schema migration, no new dependency.
