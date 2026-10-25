# Design

## Evidence

- **Timezone.** There is no space timezone. `User.timezone` (IANA, nullable) is the user's.
  - `userTimeZone(prisma, userId)` in `schedule-tools.ts` reads it, with UTC as the fallback, and
    routines resolve "9 AM" with it.
  - The executor puts `formatCurrentTimeInstruction(now, user.timezone)` into every run's prompt.
  - The web adopts the browser's zone on first sign-in (`preferences.adoptTimezone`), and `MeSchema`
    carries it.
- **Routine scheduling.**
  - Each reconcile pass of `createJobReconciler` (every 30 s, leader only) lists `routines` where
    `active` and `nextRunAt <= now + 60 s`.
  - It enqueues `routineWakeupJob(id, nextRunAt)`, which has `availableAt` set and the replace key
    `routine:<id>`.
  - The `routine.wakeup` handler runs as the routine's tenant (`asOwner`).
  - Optional `reconcileX` hooks in the same pass already host other periodic work, such as cloud
    agents, computer updates and home storage.
- **Unknown job names.** Graphile Worker registers a task list built from the handler keys, so an
  old worker never fetches a `ticket.dates` job.
- **Wakes.**
  - `wakeTicketAssignee` creates a queued `tickets` run with a fixed prompt
    (`ticketWakePrompt(ref)`).
  - It skips completed tickets and tickets that already have a queued run for the same owner.
  - `createTicket` and `updateTicket` ask `onTicketChange` to wake on assignment.
- **Push.** `notifyMentionedUser` in `ticket-changes.ts` sends a `help` notification through
  `NotificationProvider`, honouring the Nurling's `notifyOnFinish`.
- **Tools.**
  - `executor.ts` maps `ticket_create` and `ticket_update` args field by field into
    `createTicket` / `updateTicket`.
  - The router spreads its input into the same functions, so the contract fields flow through
    unchanged.
- **Files.**
  - `ArtifactFileCard` renders `{mimeType} · {size}` for any type it can't preview, meaning anything
    other than Markdown, HTML, PDF, MP4 and audio.
  - `formatFileSize` (core) and `attachmentExtensionForMimeType` (core) exist.
- **UI kit.** `ui-web` has `Popover`, `Button`, `Input` and `Toggle`, but no `Calendar`. The official
  registry's `base-nova/calendar` depends on `react-day-picker` and `date-fns`.

## Data

`tickets` gets these columns, all additive:

| Column | Type | Meaning |
|---|---|---|
| `startAt` | timestamptz null | Start instant |
| `startHasTime` | bool default false | false: a date, resolved to 9 AM |
| `dueAt` | timestamptz null | Due instant |
| `dueHasTime` | bool default false | false: a date, resolved to 23:59 |
| `startWokenAt` | timestamptz null | Start wake handled (fired or skipped) |
| `dueWarnedAt` | timestamptz null | Heads-up handled |
| `overdueNotifiedAt` | timestamptz null | Overdue push handled |
| `scheduleAt` | timestamptz null, indexed | Earliest pending reminder |

The reminder times are pure functions of the stored row, in `ticket-dates.ts`:

- start: `startAt`;
- heads-up: `dueAt − 3 h` when the due has a time, otherwise `dueAt − 14 h 59 min`, which is 9:00
  local because a due without a time is stored at 23:59 local and DST shifts happen in the small
  hours, before 9 AM;
- overdue: `dueAt`.

`scheduleAt` is the earliest of those whose flag is still null. The job never needs the timezone.

On a date change, in the same transaction:

- New start:
  - if it is null or not in the future, `startWokenAt = now`;
  - otherwise `startWokenAt = null`, so the start wake is pending.
- New due:
  - each of `dueWarnedAt` and `overdueNotifiedAt` is set to `now` when its time has already passed;
  - otherwise it is reset to null.
- `scheduleAt` is recomputed.

## Decisions

### 1. Wall-clock input, resolved once on the server (recommended)

Clients and tools send `start` / `due` as `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm` (local, without an
offset), or `null` to clear. The server resolves it in the acting user's saved timezone, using one
helper (`resolveTicketDate`): 9 AM or 23:59 when there is no time, and DST-safe through `Intl`
offsets. The web computes the quick picks ("today", "this weekend") in the same saved timezone, which
it reads from `rpc.me`, so the picker and the server agree on what "today" means.

Alternative: the client sends an ISO instant. That puts the 9 AM and end-of-day rule in two places
(the web and the tool path), and a Nurling would have to do timezone arithmetic itself.

### 2. The reconciler finds tickets through one optional hook (recommended)

`createJobReconciler` gains an optional `reconcileTicketDates` in its existing auxiliary list. That
is a two-line edit to the upstream file. The hook (`enqueueDueTicketDates` in `ticket-dates.ts`) runs
the routine pattern:

- find tickets with `scheduleAt <= now + 60 s` and an owner, oldest first, with the same batch size;
- enqueue `ticketDatesJob(id, scheduleAt)` with `availableAt`, keyed `ticket.dates:<id>`.

It runs in the same leader-only pass, on the same interval and lookahead. Date changes don't enqueue
directly: the next pass, within 30 s, picks them up, and every reminder is at least minutes away.

Alternative: an inline ticket query beside the routine query in `job-reconciler.ts`. It mirrors the
routine code more literally, but costs about 25 lines in an upstream hot spot.

### 3. A reminder that is already due when a date is set is skipped (recommended)

Setting a due at 10 AM when it is 9 AM sends no heads-up, and setting a due in the past sends no
overdue push. The user (or the Nurling) just looked at the date, and waking or pushing right away
would be noise. It would also wake a Nurling that is mid-run, since it set the date itself.

Alternative: fire immediately while the due is still in the future. Every "due today" set in the
afternoon would then cause a wake.

### 4. "Open" for date wakes means To do, In progress or Blocked (recommended)

The start wake, the "start cleared or moved to the past" wake, the heads-up and the overdue push all
use one predicate: the ticket is not In review, Done or Won't do. The brief sets this for the due
wakes. Using it for the start too means a ticket already in review isn't sent back to work by its
start date.

The existing rule that a user's comment wakes the owner while the ticket is not Done or Won't do is
unchanged.

### 5. Calendar from the official registry (recommended)

`pnpm exec shadcn add calendar` in `packages/ui-web` vendors `calendar.tsx` and adds `react-day-picker`
and `date-fns`, pinned to exact versions as in the rest of the repo. It is themed with tokens, and the
picker passes the user's timezone to its `timeZone` prop.

Alternative: a native `<input type="date">`. It adds no dependency, but its popup can't be styled
and it doesn't match the rest of the modal.

## Other details

- **Deferred assignment wake.** `createTicket` and `updateTicket` skip `wakeAssignee` on assignment
  while `startAt > now`. When the user clears a pending future start, or moves it to now or earlier,
  `updateTicket` sets `wakeAssignee` if the ticket has an owner and is open, unless the change came from
  the owner itself (a Nurling editing its own ticket isn't woken).
- **The job.** The `ticket.dates` handler runs as the tenant of the ticket's owning Nurling.
  1. It takes the row lock and re-reads the ticket.
  2. It returns when `scheduleAt` is null or later than now.
  3. It handles each pending reminder whose time has come: it marks the flag, and decides whether to
     act from the current status and owner.
  4. It recomputes `scheduleAt` and commits.
  5. After the commit:
     - it wakes the owner with `wakeTicketAssignee`, which gains an optional `prompt`, using the
       heads-up prompt when both the start and the heads-up fire;
     - and/or it pushes the user.
  A ticket that loses its owner is left out by the reconciler query, so it doesn't spin. Its
  reminders resume when an owner is set.
- **Prompts** (model-facing, not UI):
  - the start wake reuses `ticketWakePrompt`;
  - the heads-up is "Ticket {ref} is due {when}. Read it with ticket_get. Finish it, or comment on the
    ticket to tell the user what is blocking it, and keep its status current with ticket_update."
  - `{when}` is formatted in the owner's user's timezone, for example "Fri, Oct 30, 3:00 PM", or
    "end of Fri, Oct 30" when the due has no time.
- **Push.** `notifyMentionedUser` becomes `notifyTicketUser({ title, body })`, used by both mentions
  and overdue. The overdue push has the title "{ref} is overdue" and the ticket title as its body.
- **Display** (`TicketModal/dates.ts`, using the saved timezone and `Intl`):
  - Today, Tomorrow or Yesterday;
  - otherwise the weekday for the next 6 days ("Fri");
  - otherwise "Nov 4", with the year when it isn't this year;
  - plus " 3 PM" (or " 3:30 PM") when the date has a time.
  - The card line is `start – due`, `start –` or `due`, with a calendar icon. The due part takes
    `text-destructive` when it is overdue and the ticket is open.
- **Validation.** A start later than the due is refused with "Start must be before due." (contract
  refine where both are in the input, and a server check against the stored other date).
- **File card.** `TicketFileCard` is a download button like the shared card's plain variant, with
  "TXT · 22 B" from the name's extension or the type's usual extension. It is used only for the types
  the shared card does not preview. The ticket list keeps that small set next to the card, with a
  comment pointing at `ArtifactFileCard`.
