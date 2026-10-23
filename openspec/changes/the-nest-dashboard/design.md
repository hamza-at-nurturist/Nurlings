# Design

## Findings from the codebase

### Bot states and the five moods

`bots.list` returns full `Bot` rows. The state fields are:

- `status: string`: the status of the bot's latest active run, or `"idle"` when it has none
  (`packages/db/src/repos.ts`). Run statuses: `queued`, `leased`, `running`, `waiting_input`,
  `waiting_takeover`, `completed`, `failed`, `cancelled` (`RunStatus`).
- `runErrorId: Id | null`: the latest run in the thread when it `failed`, unless the bot is now
  waiting on the user. Dismissal of that error lives in `Shell` component state only.
- `incomingCall`, `unread`, `updatedAt`: not state.

| Mood | Derived from | New backend data? |
|---|---|---|
| Working | `status` in `queued`, `leased`, `running` (`WORKING_RUN_STATUSES`) | No |
| Needs you | `status` in `waiting_input`, `waiting_takeover` (`WAITING_ON_USER_RUN_STATUSES`) | No (see note) |
| Error | `runErrorId != null` | No (see note) |
| Idle | `status = "idle"` and not sleeping | No |
| **Sleeping** | **no such concept exists** | **Yes, a definition (derived, not stored)** |

Precedence: needs you, then error, then working, then idle, then sleeping.

Notes:

- `waiting_input` covers every pause for the user (a question, an approval, a secret request,
  a login card), not only approvals. The mood is called "Needs you" for that reason; the tray tells
  them apart. `waiting_takeover` is a computer takeover request.
- Error is a latest-run signal. The Nest cannot honour the Shell's per-session dismissal, so a
  failed bot shows Error until its next run starts. This is stated, not hidden.
- **Sleeping needs a decision.** Nothing in the data model says a bot is asleep. Proposal:
  sleeping = idle, with no active routine armed (`Routine.active` and `nextRunAt`) and no run in
  the last 24 hours. A bot with an armed routine is idle ("waiting for its next run"), which is
  truthful. This is computed from data the snapshot already reads (last run time, routines), so
  there is **no schema change**. The threshold is a constant in the mood function, one place to
  change. Please confirm or give another definition.

The mood function is pure, lives in `@rakazo/core`, and has a table-driven unit test. The server
computes it and returns `mood` in the snapshot, so web and mobile cannot disagree.

### Routines, schedules and approvals

- **Routine** (Prisma `Routine`, contract `RoutineSchema`): `crons[]`, `timezone`, `active`,
  `nextRunAt`, `lastRunAt`, plus other triggers (webhook, GitHub, message, and a `watch` change
  trigger). A routine run is a `Run` with `trigger = "routine"` and `routineId`.
- Existing endpoints are per bot or per routine only: `routines.list({botId})`,
  `routines.history({routineId})`. There is no cross-bot list, so the dashboard would need N+1
  calls. A single server-side read is cleaner. **New endpoint needed.**
- The card uses the stored `nextRunAt`; no cron expansion is needed.
- A `watch` routine's `nextRunAt` is the next *check*, not a scheduled run. The card ignores
  these for "next routine".
- **Approvals are not a table.** A pending approval is an `ask` block (`status != "answered"`,
  optionally with `approvalEffectId` and `actions`) on a message whose run is `waiting_input`.
  `runs.list({filter: "active"})` returns waiting runs but not the ask. `threads.get` returns
  asks, per thread. So the cross-bot tray needs **a new read** (inside `nest.snapshot`).
- **Answering already exists**: `threads.answer({botId | groupId, runId, messageId, answer})`.
  Phase 2 reuses it unchanged; the server keeps validating the answer. No new write endpoint.
- Secret asks (`input: "secret"`, login cards) are never answerable from the tray and the
  snapshot omits their text and detail; the tray shows the Nurling and opens the thread.

### Live updates today

- `Shell` polls `bots.list` every 3 s, plus on window focus and visibility change, skipping
  while hidden and while a refresh is in flight.
- The open thread uses SSE-style streaming: `threads.subscribe` (oRPC `eventIterator`, cursor
  based) carrying `run.*`, `thread.*` product events.
- Boards have a space-level transient signal, `boards.subscribe`, over `RealtimeFanout`
  (`createBoardEvents`): clients refetch on any frame.
- `ActivityList` polls `runs.list`.
- There is **no space-wide run/approval stream**.

Decision: reuse the Shell's pattern. The Nest polls `nest.snapshot` every 3 s while the page is
visible, one request instead of one per Nurling, never overlapping. A push
signal modelled on `boards.subscribe` is a future idea, not built.

### Current task

The active run's `Task.prompt`, trimmed to one line with the existing `activityPreview` helper
(it already handles agent-to-agent messages and skips background ticket runs). When the Nurling
is waiting, the card shows the waiting state instead of a task; when idle it shows nothing.

## API shape

One RPC, `nest.snapshot` (no input; scoped to the caller's space and user). The output is an
object of named sections so a later section is a new key:

```
{
  nurlings: [{ id, name, title, color, mood, updatedAt,
               currentTask: { runId, status, text } | null,
               nextRoutine: { routineId, name, at } | null }],
  needsYou: [{ botId, groupId, runId, messageId, kind, text, askedAt }]
}
```

`kind` is `"question" | "approval" | "secret" | "takeover"`; `text` is null for `secret`. Types
live in the new `packages/contracts/src/nest.ts` (zod). Queries live in `apps/api/src/nest.ts`: a
few bounded reads over the caller's space (non-archived bots with their latest run, armed
routines, runs waiting on the user with their ask message). Ask text goes through the same
message-block read path `threads.get` uses, so encrypted content is handled identically.

## UI

```
 The Nest
┌─ Needs you ───────────────────────────────────────────────────────────┐
│ (A) Ada  "Send the quote to Dana?"                        [ Open ]    │
│ (B) Bo   Needs a computer takeover                        [ Open ]    │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ (avatar)◉◉        │ │ (avatar)◉◉        │ │ (avatar)◉◉        │
│ Ada               │ │ Bo                │ │ Cy                │
│ Drafting Q3 deck… │ │                   │ │                   │
│ Next: Inbox · 14:00│ │ Next: Digest · 17:00│ │                 │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

`◉◉` is the eyes badge. The grid is one column on narrow screens and the tray renders nothing
when empty. Cards open the Nurling's thread (`/app/:botId`). The page uses `WindowChrome`, the
shadcn components already in `@rakazo/ui-web` and the existing `BotAvatar`. It follows the
light/dark theme.

The page is a list of section components rendered in order, each taking the snapshot and
rendering its own part (or nothing): `NeedsYouTray`, `NurlingGrid`. A future section is a new
component in that list.

### Eyes badge

An inline SVG of the two slanted eyes, taken from the brand mark's orb geometry in
`@nurlings/brand` (the eye sub-paths of `brand.mark.orb`; no copied path data). Moods change
colour, shape and motion, never the shape family:

| Mood | Look | Motion (subtle, CSS only) |
|---|---|---|
| Working | open eyes, orb gradient from the brand config | slow glance left and right |
| Idle | open eyes, foreground colour | rare blink |
| Sleeping | eyes closed to thin slits, muted | slow opacity "breath" |
| Needs you | wide eyes, `warning` token | small lift, two cycles then still |
| Error | eyes tilted down, `destructive` token | one short shake, then still |

Colours come from semantic tokens; only the working gradient comes from the brand config. No
hardcoded hex. Navy `#03091F` is not a page background; the Nest follows the theme. Motion is off
under `prefers-reduced-motion`, and the badge's accessible name is the mood.

## Placement

A separate menu entry at `/app/nest`, not the default home. `/app` belongs to `Shell`, about
4,000 lines of upstream code; making the Nest the home means editing its selection logic and the
first-run flow, the highest-conflict spot in the repo. A route plus one menu item is a handful of
lines and ships quickly. The entry shares the account menu with Artifacts and Board.

## Desktop

Electron loads the web UI, so the Nest appears in the desktop app with no desktop code.

## Polling

The page fetches `nest.snapshot` every 3 s, the Shell's cadence, only while mounted and the tab
is visible. It refreshes on focus and on becoming visible, skips a tick while a request is in
flight, so responses cannot arrive out of order.

## Risks

- `waiting_input` mixes approvals with plain questions, hence "Needs you".
- Polling a heavier snapshot every 3 s: the queries are bounded to the space and the visibility
  gate keeps the cost near `bots.list`.
- Group-thread asks carry `groupId` so the link opens the right thread.
- Spaces: current space only.
