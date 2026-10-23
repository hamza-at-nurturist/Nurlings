# Proposal

## Why

With more than a couple of Nurlings, the only way to know what they are doing is to open each
chat. There is no single place that answers "is anything stuck, is anything waiting on me, what
runs next?". The Nest is that place: every Nurling at a glance, and the things that need the
user pulled to the top.

## What Changes

New web screen **The Nest** at `/app/nest` (the desktop app shows it too, since Electron hosts
the web UI). Scope is deliberately small:

1. **Nurling cards.** One card per non-archived Nurling in the current space: its existing avatar
   as is, a small **eyes badge** drawn from the two slanted eyes of the logo with one of five
   moods (working, idle, sleeping, needs you, error) and a subtle animation per mood, the current
   task, and the next scheduled routine. The badge only reports status; the avatar stays the
   identity.
2. **Needs you tray** above the cards: pending asks across all Nurlings, read-only. Each item
   shows the Nurling and opens its thread. Nothing is answered from the tray.

Backend: one new read endpoint, `nest.snapshot`, returning `{ nurlings, needsYou }`, and one pure
mood function in `@rakazo/core`. No migration, no new tables, no new packages or dependencies, no
new build targets or CI jobs. Polling reuses the Shell's pattern and runs only while the Nest
page is visible.

### Built to extend, not extended yet

- The snapshot is an object of named sections. A new section is a new key; existing keys never
  change shape.
- The page is a list of separate section components (`NeedsYouTray`, `NurlingGrid`). A new section
  is a new component added to that list.
- The mood logic is one tested pure function.

### Future ideas (not commitments, nothing for them is built)

These stay here only so the foundation above is chosen with them in mind:

- Answer simple asks in place from the tray, reusing the existing `threads.answer`.
- A "today" stats line per Nurling (runs done and failed, routine runs, tokens).
- A routines timeline for today across all Nurlings.
- A live signal (`nest.subscribe`) if polling proves too chatty.
- A mobile screen reading the same snapshot and mood.
- Promoting the Nest to a sidebar button or the default home.

### Where it lives

A separate entry in the existing account menu (next to Artifacts and Board) at `/app/nest`, not
the default home. See design.md, "Placement".

### User-facing copy

Every visible word, with why it stays:

- Menu entry and page title **"The Nest"**: the feature's name; needed to find it.
- Tray heading **"Needs you"**: the one label that explains the tray; the tray renders nothing
  when empty, so the text appears only when relevant.
- Mood names **Working / Idle / Sleeping / Needs you / Error**: accessible name and tooltip of the
  eyes badge only, not text on the card.
- **"Next: {routine name} · {time}"**: the name and time are the content; "Next:" tells it apart
  from the current task line.
- Tray item button **"Open"**: the only action. A name-only link would be ambiguous in a row that
  also shows the question.

Bot nouns come from the brand config, never a hardcoded product word.

### Upstream merge safety

New files wherever possible. Edits to existing upstream files, each a few lines:

| File | Edit |
|---|---|
| `packages/contracts/src/rpc.ts` | add `nest: { snapshot }` and its import |
| `packages/contracts/src/index.ts` | one `export * from "./nest.js"` line |
| `packages/core/src/index.ts` | one export line for the mood function |
| `apps/api/src/router.ts` | one import and a `nest: { snapshot }` handler delegating to `apps/api/src/nest.ts` |
| `apps/web/src/App.tsx` | one lazy import and one `<Route path="/app/nest">` |
| `apps/web/src/pages/Shell.tsx` | pass `onNest` to the account menu (same shape as `onBoard`) |
| `apps/web/src/components/SidebarFooter.tsx` | one extra menu item, `onNest` |
| `apps/web/src/locales/*.po` | regenerated catalog entries for the new strings |

Everything else is new: `packages/contracts/src/nest.ts`, `packages/core/src/nest-mood.ts`,
`apps/api/src/nest.ts`, `apps/web/src/pages/Nest.tsx`, `apps/web/src/components/nest/*`, their
tests and one E2E spec. Nothing contacts Rakazo-owned infrastructure and no internal names change.

## Impact

- Capability: new `the-nest` spec.
- No Prisma migration, so the side-by-side deploy rule is unaffected.
- Security: the snapshot is scoped to the caller's space and user like `runs.list`; secret asks
  never expose their content.
