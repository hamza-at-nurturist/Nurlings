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
| Needs approval | `status` in `waiting_input`, `waiting_takeover` (`WAITING_ON_USER_RUN_STATUSES`) | No (see note) |
| Error | `runErrorId != null` | No (see note) |
| Idle | `status = "idle"` and not sleeping | No |
| **Sleeping** | **no such concept exists** | **Yes, a definition (derived, not stored)** |

Precedence: needs approval, then error, then working, then idle, then sleeping.

Notes:

- `waiting_input` covers every pause for the user (a question, an approval, a secret request,
  a login card), not only approvals. The badge says "Needs approval" as asked; the tray tells
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
- `core/cron.ts` already has `nextCronDate`, `nextCronDateAcross`, used for "next run". The
  timeline (phase 3) expands today's remaining occurrences with the same helpers, capped.
- A `watch` routine's `nextRunAt` is the next *check*, not a scheduled run. The card ignores
  these for "next routine" and the timeline marks them as checks (phase 3).
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

Decision: reuse the Shell's pattern. The Nest polls `nest.snapshot` every 3 s while the tab is
visible and focused, one request instead of one per Nurling, with the same
stale-response guard. If that proves too chatty, phase 3 adds `nest.subscribe`, modelled on
`boards.subscribe` (a transient "changed" frame, client refetches). Not built before it is needed.

### Today's stats: what can honestly be built

"Today" is the user's local day (`me.timezone`, falling back to the browser's). From existing data:

| Stat | Source | Notes |
|---|---|---|
| Done | `Run` with status `completed`, `completedAt` today | A run is one handled request; call it "done" |
| Failed | `Run` with status `failed`, `completedAt` today | Shown only when non-zero |
| Routine runs | `Run` with `trigger = "routine"`, created today | Includes failed; ties to the timeline |
| Tokens | `UsageRecord.totalTokens` summed for the bot, `createdAt` today | Nullable per row: sum what exists |

Deliberately left out: messages sent (noisy, not a measure of work), cost (`costUsd` is nullable
and partly estimated per `costSource`; a wrong total is worse than none, so it can come later if
the maintainer wants it), anything like "time saved". Phase 2 ships these four, failed only when
non-zero.

### Current task

The active run's `Task.prompt`, trimmed to one line with the existing `activityPreview` helper
(it already handles agent-to-agent messages and skips background ticket runs). When the Nurling
is waiting, the card shows the waiting state instead of a task; when idle it shows nothing.

## API shape

One RPC, `nest.snapshot` (no input; scoped to the caller's space and user):

```
{
  generatedAt, timezone,
  bots: [{ id, name, title, color, mood, currentTask?: { runId, status, trigger, text, startedAt },
           lastRunAt, nextRoutine?: { routineId, name, at },
           today?: { done, failed, routineRuns, tokens } }],        // today: phase 2
  needsYou: [{ botId, groupId?, runId, messageId, kind: "approval"|"question"|"secret"|"takeover",
               text?, detail?, actions?: [{ id, label }], askedAt }],
  timeline?: [{ botId, routineId, name, at, state: "ran"|"failed"|"running"|"next"|"check",
                runId? }]                                           // phase 3
}
```

Types live in the new `packages/contracts/src/nest.ts` (zod), with an older-payload-safe default
for each optional field, like `runErrorId`. Queries live in `apps/api/src/nest.ts`: four
indexed reads (bots with their latest run, active routines, waiting runs with their ask message,
phase 2/3 aggregates), each bounded by the space. Content encryption: ask text goes through the
same message-block read path `threads.get` uses, so encrypted content is handled identically.

## UI

Desktop width sketch:

```
 The Nest
┌─ Needs you ───────────────────────────────────────────────────────────┐
│ (A) Ada ◉◉  "Send the quote to Dana?"                 [ Open ]        │  phase 2: [Approve] [Decline]
│ (B) Bo  ◉◉  Needs a computer takeover                 [ Open ]        │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│ (avatar)◉◉        │ │ (avatar)◉◉        │ │ (avatar)◉◉        │
│ Ada               │ │ Bo                │ │ Cy                │
│ Drafting Q3 deck… │ │ Needs you         │ │                   │
│ Next: Inbox · 14:00│ │ Next: Digest · 17:00│ │ Next: none      │
│ 6 done · 1 failed │ │ 2 done            │ │ 0 done           │  phase 2
└───────────────────┘ └───────────────────┘ └───────────────────┘

 Today                                                            phase 3
 09:00 ●Inbox (Ada)  ✓   10:30 ●Digest (Bo) ✗   │now│   14:00 ○Inbox (Ada)   17:00 ○Digest (Bo)
```

`◉◉` is the eyes badge. The grid collapses to one column on narrow screens. The tray renders
nothing when empty. Cards open the Nurling's thread (`/app/:botId`). Components are shadcn/ui from
`packages/ui-web` (Card, Badge, Tooltip) and the existing `BotAvatar`; AI-moment primitives from
`apps/web/src/components/ai/` are reused for the loading state.

### Eyes badge

An inline SVG of the two slanted capsule eyes, taken from the brand mark geometry in
`@nurlings/brand` (no copied path data). Moods change colour, shape and motion, never the shape
family:

| Mood | Look | Motion (subtle, CSS only) |
|---|---|---|
| Working | open eyes, orb gradient from brand config | slow glance left and right |
| Idle | open eyes, foreground colour | rare blink |
| Sleeping | eyes closed to thin slits, muted | slow opacity "breath" |
| Needs approval | wide eyes, `warning` token | small lift, two cycles then still |
| Error | eyes tilted down, `destructive` token | one short shake, then still |

Colours come from semantic tokens in `@rakazo/ui-tokens`; only the orb gradient comes from
`@nurlings/brand` (`colors.orbGradient`), used for the working eyes. No hardcoded hex. Navy
`#03091F` is the brand's icon/splash colour and is not used as a page background, because the app
follows the light/dark theme and is monochrome; the Nest follows the theme. Every motion is
disabled under `prefers-reduced-motion`, and the badge has the mood as its accessible name.

## Placement

Recommendation: **a separate menu entry at `/app/nest`; do not make it the default home yet.**

- `/app` is owned by `Shell` (about 4,000 lines of upstream code) which picks the first bot or the
  welcome state. Making the Nest the home means editing that selection logic and the first-run
  flow, the highest-conflict spot in the repo.
- A new route plus one menu item is a handful of lines and ships quickly.
- Users who live in one chat should not lose their landing view before the Nest has proven itself.
- The entry sits in the same account menu as Artifacts and Board, which is the lowest-conflict
  place but not very prominent. If the Nest sticks, a follow-up promotes it to a sidebar header
  button and, behind a preference, to the home screen.

## Desktop

Electron loads the web UI, so the Nest appears in the desktop app with no desktop code. The
desktop Playwright suite is not run locally; CI covers it.

## Mobile (later change)

Not in this change. What it would take: a new Expo Router screen `apps/mobile/app/nest.tsx`
reading the same `nest.snapshot` through the existing RPC client and the same `mood` field, so the
logic is shared. The pieces that are native work: cards as plain StyleSheet with tokens from
`lib/appearance`, the eyes badge as a small react-native-svg view with Reanimated (the logo
geometry is shared via `@nurlings/brand`), the tray answering through native alerts or action
sheets, and an entry in native navigation. Push notifications for approvals already exist.
Roughly one phase of the size of web phase 1, after the web design settles.

## Risks and open questions

- **Sleeping definition** (above) needs the maintainer's call.
- `waiting_input` mixes approvals with plain questions; the badge label may over-promise. The
  tray labels the kind. Alternative: name the mood "Needs you". Your call.
- Polling every 3 s with a heavier snapshot: bounded queries and the visibility gate keep it
  close to today's `bots.list` cost; measured in phase 1 before adding anything.
- Group-thread asks are answered with `groupId`; the tray carries it through.
- Spaces: the Nest shows the current space only. Cross-space view is out of scope.
