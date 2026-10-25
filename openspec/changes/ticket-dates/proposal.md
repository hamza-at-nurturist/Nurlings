# Proposal

## Why

A ticket has no dates. You can't say "start this Monday" or "this is due Friday at 3". Nurlings pick
up a ticket the moment it is assigned and never hear about a deadline, and nothing tells you when a
ticket is late. This change adds an optional start and due date-time to tickets. The Board shows them
and acts on them: a ticket wakes its Nurling when its start arrives, the Nurling gets one heads-up
before the due time, and you get one push when the ticket is overdue.

## What Changes

### Dates on a ticket (web and desktop)

- Each ticket gets an optional **Start** and **Due**, each either a date or a date with a time.
- The modal's properties row gains Start and Due next to status, owner and priority. Each opens the
  same picker, a `Popover` that holds:
  - quick picks: Today, Tomorrow, This weekend (Saturday, or today when it is the weekend) and Next
    week (next Monday);
  - a calendar (shadcn `Calendar`);
  - an optional time behind "Add time";
  - "No date", which clears the date.
- A date without a time means 9 AM for a start and end of day (23:59) for a due.
- Board cards show a ticket's dates on one short line, and only when it has some.
- Dates read short and relative: "Today", "Tomorrow", "Fri 3 PM", "Nov 4" ("Nov 4, 2027" in another
  year). A due date that has passed shows in the destructive color while the ticket is not In review,
  Done or Won't do.
- A start after the due is refused.

### Which timezone

Spaces have no timezone of their own, so dates resolve in the timezone saved on the acting user's
account (`User.timezone`). Routines use the same one, and so does the current-time line in every
run. It is taken from the browser at first sign-in, can be changed in Settings, and is UTC when
unset. A Nurling's dates use its user's timezone, the same way. A date is stored as an instant with a
"has time" flag, so changing your timezone later doesn't move dates you've already set.

### Waking and reminders

- **Future start.** Assigning a ticket (on create or reassign) whose start is in the future doesn't
  wake the owner. The owner is woken when the start arrives, if the ticket is still assigned and
  not In review, Done or Won't do. If a future start is cleared, or moved to now or earlier, while
  the ticket is assigned and in one of those states, the owner is woken right away. A user's comment
  or a mention still wakes as it does today.
- **Due heads-up.** One wake to the owner before the due: 3 hours before when the due has a time, at
  9 AM on the due date when it doesn't. It only happens while the ticket is not In review, Done or
  Won't do. The prompt says the ticket is due and asks the Nurling to finish it or comment what is
  blocking it.
- **Overdue.** When the due passes and the ticket is still not In review, Done or Won't do, the user
  gets one push through the existing push channel. This is the same path and the same "notify on
  finish" setting of the owning Nurling as a mention push.
- Each of these happens once per date. Changing a date resets its own reminders. If a reminder's
  time has already passed when the date is set, that reminder is skipped. Setting a due of 10 AM at
  9 AM sends no heads-up, and setting a past due sends no push.

### Scheduling (existing mechanism, no new scheduler)

- Tickets get `scheduleAt`: the next moment any date reminder is pending. It is recomputed in the
  same transaction as any date change and whenever a reminder fires.
- The job reconciler finds tickets whose `scheduleAt` is within its lookahead, the same way it finds
  routines by `nextRunAt`. For each it enqueues a `ticket.dates` worker job at that time, keyed per
  ticket, as routine wake-ups are.
- The job locks and re-reads the ticket. It does nothing when `scheduleAt` has moved later or been
  cleared. Otherwise it handles each reminder whose time has come, acting only if the ticket's status
  and owner still qualify. It marks each one handled either way, so no reminder repeats and a stale
  job does nothing. Then it computes the next `scheduleAt`.

### Nurlings

- `ticket_create` and `ticket_update` take optional `start` and `due`, each a local date
  (`2026-10-30`) or a local date-time (`2026-10-30T15:00`) in the user's timezone, or `null` to clear.
  A Nurling turns "by Friday" into a date from the current-time line it already gets, and the server
  resolves that date in the same timezone the picker uses.
- `ticket_get` and `ticket_list` return the dates as part of the ticket.

### Ticket file cards

- On the ticket's Files, a card that would read "text/plain · 22 B" reads "TXT · 22 B". The short
  name is the file's extension, or the type's usual extension when the name has none. Chat and
  `ArtifactFileCard.tsx` are not changed. The ticket's Files use a small ticket-only card for these
  files, and previewable and audio files keep the shared card.

### Mobile

Mobile has no board screen. Nothing changes there. The overdue push reaches mobile through the
existing push channel.

### Proposed copy

| Copy | Where | Why it is needed |
|---|---|---|
| `Start`, `Due` | Properties labels; the date line's accessible names | Name the two fields, as `Status`, `Owner` and `Priority` do |
| `Today`, `Tomorrow`, `This weekend`, `Next week` | Picker quick picks | The requested quick picks |
| `Today`, `Tomorrow`, `Yesterday` | Relative date display | Short relative dates; other dates come from `Intl` with no new strings |
| `Add time` | Picker | Shows the time field only when needed (progressive disclosure) |
| `No date` | Picker | Clears the date |
| `Start must be before due.` | Error when saving | Explains a refused save |
| `{ref} is overdue` (push title; the body is the ticket title) | Overdue push | The push needs a title |

An empty date shows only a calendar icon (its name comes from the `Start` or `Due` label), so there is
no "Set date" text. There are no tooltips or hints.

### Upstream merge safety

| File | Edit |
|---|---|
| `packages/db/prisma/schema.prisma` + one migration | Ticket date columns, reminder flags, `scheduleAt` and its index |
| `packages/contracts/src/board.ts` | Dates on `TicketSchema`, `start`/`due` on create and update input |
| `packages/db/src/board.ts` | Dates in `toTicketDto` |
| `packages/adapter-kit/src/{types,background-jobs}.ts` | The `ticket.dates` job name, payload schema and builder, next to `routine.wakeup` |
| `packages/adapters/src/job-reconciler.ts` | **One optional hook**, `reconcileTicketDates`, added to the existing auxiliary list (two lines) |
| `packages/adapters/src/background-job-handlers.ts` | The `ticket.dates` handler, run as the ticket's tenant like the others |
| `packages/adapters/src/executor.ts` | **Four lines**: pass `args.start` and `args.due` in the existing `ticket_create` and `ticket_update` branches |
| `packages/adapters/src/builtin-tools.ts` | `start` and `due` on `ticket_create` and `ticket_update` |
| `packages/adapters/src/ticket-tools.ts`, `ticket-wake.ts`, `ticket-changes.ts` | Resolve and save dates, defer the assignment wake, take a prompt for the wake, generalise the push helper |
| `packages/adapters/src/ticket-dates.ts` (new) | Date resolution, reminder times, the reconciler query and the job |
| `apps/worker/src/index.ts`, `apps/api/src/app.ts` | Wire the hook and the handler where the reconciler and handlers are built |
| `packages/ui-web` | `pnpm exec shadcn add calendar` from the official registry, plus its export |
| `apps/web/src/pages/Board.tsx` | The card's date line, and the user's timezone (read once with `rpc.me`) passed to the modal |
| `TicketModal/` (new `DatePicker.tsx`, `dates.ts`, `TicketFileCard.tsx`; edits to `Properties.tsx`, `TicketModal.tsx`, `TicketFiles.tsx`) | Picker, display, file card |

`ArtifactFileCard.tsx` and the create dialog are not touched.

### Not changed, on purpose

- No new scheduler, timer or polling loop. Reminders ride the reconciler and the worker queue.
- No dates in the "New ticket" dialog. Dates are set from the modal after the ticket is created.
- Date changes don't add lines to the activity feed.
- No recurring tickets, no reminders to Nurlings other than the owner, and no heads-up while a ticket
  is In review, Done or Won't do.
- No space timezone setting. The existing user timezone is used.

## Decisions

See `design.md`. The open choices, with a recommendation for each, are:

1. Where a wall-clock date becomes an instant.
2. How the reconciler finds tickets.
3. Heads-up and push times that have already passed.
4. Which statuses count as "open" for the start wake.
5. Calendar dependency.

## Impact

- Capability: extends `board-tickets`.
- Prisma migration: eight nullable or defaulted columns and one index on `tickets`, all additive.
- API:
  - `tickets.create` and `tickets.update` gain optional `start` and `due`;
  - tickets gain `startAt`, `startHasTime`, `dueAt` and `dueHasTime`;
  - no new RPC.
- Worker: one new job name, `ticket.dates`. Graphile only hands a worker the job names it
  registered, so a worker from the previous release never picks one up during the deploy overlap.
- Dependencies: `react-day-picker` and `date-fns` in `@rakazo/ui-web`, pulled in by the registry's
  calendar.
- Contacts no Rakazo-owned infrastructure.
