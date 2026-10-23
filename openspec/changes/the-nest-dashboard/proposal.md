# Proposal

## Why

With more than a couple of Nurlings, the only way to know what they are doing is to open each
chat. There is no single place that answers "is anything stuck, is anything waiting on me, what
runs next?". The Nest is that place: every Nurling at a glance, and the things that need the
user pulled to the top.

## What Changes

New web screen **The Nest** (the desktop app shows it too, since Electron hosts the web UI):

1. **Nurling cards.** One card per active (non-archived) Nurling in the current space, using its
   existing avatar as is (no new avatar assets, no custom avatars). Next to the avatar sits a
   small **eyes badge**, drawn from the two slanted eyes of the logo, with one of five moods:
   working, idle, sleeping, needs approval, error. Each mood has a subtle animation (off under
   `prefers-reduced-motion`). The badge only reports status; the avatar stays the identity.
2. **Per card:** current task (the active run's prompt, one line), next scheduled routine
   (name + time), and a short "today" line (phase 2).
3. **Needs you tray** at the top: pending asks and approvals across all Nurlings. Phase 1 lists
   them and opens the thread; phase 2 answers them in place.
4. **Routines timeline for today** across all Nurlings: what ran, what is next (phase 3).

Backend: one new read endpoint, `nest.snapshot`, that returns everything the screen needs in a
single request, plus a pure mood function in `@rakazo/core`. No database migration, no new
tables, no change to how runs, routines or approvals work. Approvals are answered with the
existing `threads.answer`.

### Phases

| Phase | Ships | Why this cut |
|---|---|---|
| 1 | Route + menu entry, cards, eyes badge, current task, next routine, Needs you tray (read-only, opens the thread), `nest.snapshot`, mood function | Smallest slice that is useful and deploys to the test server on merge |
| 2 | Inline answer for asks that carry explicit actions; "today" stats | Adds the only new write path (reusing `threads.answer`) and the stats queries |
| 3 | Routines timeline for today; optional `nest.subscribe` live signal if polling proves too slow or costly | Needs cron expansion across routines and is the heaviest query |

Mobile is a later change (see design.md, "Mobile").

### Where it lives

A separate entry in the existing menu (next to Artifacts and Board) at `/app/nest`, **not** the
new default home. See design.md, "Placement", for the reasoning.

### User-facing copy

Every visible word, with why it cannot be removed or revealed later:

- Menu entry and page title **"The Nest"**: the feature's name; needed to find it.
- Tray heading **"Needs you"**: the one label that tells the tray's purpose; the tray renders
  nothing when empty, so the text is only shown when relevant.
- Mood names **Working / Idle / Sleeping / Needs approval / Error**: accessible names and tooltip
  for the eyes badge only. Not rendered as text on the card.
- Next routine **"Next: {routine name} · {time}"**: the routine name and time are the content;
  "Next:" disambiguates from the current task line.
- Tray item action labels come from the ask's own actions (phase 2); no new copy.

Bot names use the brand config's bot noun (`@nurlings/brand`), never a hardcoded product word.

### Upstream merge safety

New files wherever possible. Edits to existing upstream files, each kept to a few lines:

| File | Edit |
|---|---|
| `packages/contracts/src/rpc.ts` | add a `nest: { snapshot }` namespace and its import |
| `packages/contracts/src/index.ts` | one `export * from "./nest.js"` line |
| `packages/core/src/index.ts` | one export line for the mood function |
| `apps/api/src/router.ts` | one import and a `nest: { snapshot }` handler that delegates to `apps/api/src/nest.ts` |
| `apps/web/src/App.tsx` | one lazy import and one `<Route path="/app/nest">` |
| `apps/web/src/pages/Shell.tsx` | pass an `onNest` handler to the account menu (same shape as `onBoard`) |
| the menu component that renders `onBoard` | one extra item, `onNest` |
| `apps/web/src/locales/*.po` | regenerated catalog entries for the new strings |

Everything else is new: `packages/contracts/src/nest.ts`, `packages/core/src/nest-mood.ts`,
`apps/api/src/nest.ts`, `apps/web/src/pages/Nest.tsx`, `apps/web/src/components/nest/*`, tests and
an E2E spec.

Nothing here contacts Rakazo-owned infrastructure, and nothing is renamed that is internal on
purpose (`@rakazo/*` packages, identifiers).

## Impact

- Capability: new `the-nest` spec.
- Code: as listed above. No Prisma migration, so the side-by-side deploy rule is not affected.
- Security: the snapshot is scoped to the caller's space and user like `runs.list`; secret asks
  never expose their content (see design.md).
- Docs-only/CI exemption: not applicable; this is a feature.
