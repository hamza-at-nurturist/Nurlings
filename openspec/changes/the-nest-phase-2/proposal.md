# Proposal

## Why

Phase 1 of The Nest is live and works: the tray, the moods and a pending question all show up
correctly. Using it with three Nurlings showed what to fix before adding more:

- The default avatars are already blob faces with eyes, so the eyes badge puts eyes on eyes, and
  idle (white) versus needs you (orange) is too small to tell apart at a glance.
- An idle card is only a name.
- Cards follow the sidebar order, so a Nurling that is stuck or waiting can sit at the bottom.

Phase 2 fixes those, lets the user answer simple questions from the tray instead of opening the
thread, and adds a small "today" line per Nurling.

## What Changes

1. **Clearer mood indicator** (decision needed, see "Options").
2. **Idle cards show the last activity**, e.g. "Last active 8:12 AM · Summarise the pricing
   pages", from run data that already exists.
3. **Card order by attention**: Needs you and Error first, then Working, then the rest in their
   current order.
4. **Answer in place** from the tray for a question that carries explicit options (like a tone
   question). It reuses `threads.answer` unchanged. Secret and login asks stay "Open", and so do
   approvals and takeovers (see "Decisions to confirm").
5. **Today's stats per card**: runs done, failed (only when above zero), routine runs and tokens.

No migration, no new tables, packages, dependencies or CI jobs. The snapshot keeps its shape:
`nurlings` and `needsYou` stay, `nurlings[]` gains fields, and stats arrive as a new key,
`today`. Polling is unchanged: one snapshot about every three seconds, only while the page is
visible.

## Options for the mood indicator

Mockups, light and dark, rendered from the repo's own `BotAvatar` and the phase 1 grid layout
(three columns at desktop width) with seeded fake data, on the default avatar colors and shapes:
`mockup/mood-indicator-light.png` and `mockup/mood-indicator-dark.png`. The top block is today's
real `NurlingGrid` for comparison (the eyes-on-eyes problem is visible there). The mockup page was
a throwaway and is not in the repo.

Both options share the same base: a **ring around the avatar** (a 3px border with a gap of card
color, so it never touches the avatar) whose color and style carry the mood, plus a **text label**
under the name. Color is never the only signal: the label is text, sleeping is dashed and faded,
working pulses.

| Mood | Ring |
|---|---|
| Needs you | `warning` |
| Error | `destructive` |
| Working | `foreground` (ink), pulsing |
| Idle | `muted-foreground` at 55%, solid |
| Sleeping | `muted-foreground` at 55%, dashed, faded |

#### Ring palette check against every default avatar color

`mockup/ring-contrast-light.png` and `mockup/ring-contrast-dark.png` show all 11 default avatar
colors with all five rings, drawn by the real component. Numbers are computed from the tokens and
the avatars' light, base and dark stops:

- Every colored ring is clearly visible against the card: contrast 4.5 to 7.7 against the card
  background in both themes. The idle ring is intentionally quiet.
- The other question is whether a ring blends into the avatar inside it. I measured perceptual
  color distance (CIE ΔE; under about 25 reads as the same hue) from each ring color to each
  avatar's three stops. My first palette used the app's existing blue `--status-working` for
  Working, and it clashed with the blue avatar (ΔE 17 light, 10 dark) and the cyan avatar (24 and
  19). **I changed Working to ink (`foreground`) with a pulse**, which also matches the app's
  "primary is ink" rule and keeps status colors to warning and destructive.
- Pairs that still sit close in hue, listed rather than hidden:

  | Ring | Avatar | Theme | ΔE |
  |---|---|---|---|
  | Error | red | light | 10 |
  | Needs you | yellow | dark | 11 |
  | Needs you | brown | light | 22 |
  | Needs you | orange | dark | 29 |
  | Working (ink) | white | dark | 0 |

  They stay readable because the gap of card color separates ring from avatar, the label names the
  mood, and Needs you and Error also move to the top of the grid. If you want these removed too,
  the remedy is a thicker 4px ring for Needs you and Error; I would add it after you pick.

- **Option A (recommended): ring + text label, eyes dropped.** The label reads "Working",
  "Needs you", "Error", "Idle", "Sleeping". The eyes badge, its CSS and its brand-mark path
  slicing are deleted. Simplest, and the only one that follows "what can be removed" to its end.
- **Option B: ring + label chip with the eyes inside it.** Same ring; the eyes leave the avatar and
  sit as a small glyph in the label chip (the mockup draws two slanted ellipses; the real glyph would be the brand mark's eye paths), keeping their per-mood shape and motion. Keeps the logo
  tie-in, costs a chip's worth of chrome on every card.

Recommendation: A. Under B the eyes add a second encoding of something the ring and label already
say.

## Decisions to confirm

1. Mood indicator: A or B.
2. **"Today"** means since the start of the user's local day. The server has no time zone for the
   user, so the page sends the start of its local day with the snapshot request (an optional
   input; absent means start of the UTC day, so a new API still serves an old web build).
3. **"Last active"** is the newest finished run (completed, failed or cancelled; background
   tickets excluded) of that Nurling: its finish time and the run's task prompt on one line. It
   is not the model's reply text, which would need decrypting and trimming message blocks for
   every card on every poll.
4. **Which asks are answerable in place:** only a plain question with explicit options. Approvals
   (allow / always / deny) stay "Open": approving an outside action should not happen from a
   one-line preview that hides the detail. Say so if you want them answerable too; it is the same
   call with the same options.
5. **Done / failed / routine runs** count non-background runs that finished today. Routine runs are
   the subset started by a routine, so they are inside done and failed, not added to them.
6. Cancelled runs count in neither done nor failed.

## User-facing copy

Every new or newly visible word, and why it stays:

- Mood names **Working / Idle / Sleeping / Needs you / Error** now show as text on the card (they
  were a tooltip). The strings already exist; no new strings. Text is the answer to "too small to
  tell apart".
- **"Last active {time} · {summary}"**: the one line that makes an idle card useful. "Last active"
  tells it apart from the current-task line, which has no prefix. Dropping it leaves a bare time
  and sentence that read as an upcoming task.
- **"Today: 4 done · 1 failed · 2 routines · 12.4k tokens"**: "Today" stops the numbers reading as
  all-time; each count word is what the number is. "failed" appears only when above zero, and the
  whole line is hidden when every count is zero. A plain number would not say what it counts.
- The tray's option buttons show the ask's own option labels (data, not copy); sending reuses the
  existing "Could not submit this answer" on failure. "Open" stays.

Bot nouns still come from the brand config.

## Upstream merge safety

Edits to existing upstream files, each a few lines:

| File | Edit |
|---|---|
| `packages/contracts/src/rpc.ts` | `nest.snapshot` gains an optional input (`dayStart`) |
| `apps/api/src/router.ts` | pass that input through to `buildNestSnapshot` |
| `apps/web/src/locales/*.po` | regenerated catalog entries for the new strings |

Everything else is Nest-only code from phase 1 or new: `packages/contracts/src/nest.ts`,
`packages/core/src/nest-mood.ts` (unchanged), `apps/api/src/nest.ts`,
`apps/web/src/lib/nest-snapshot.ts`, `apps/web/src/pages/Nest.tsx`, `apps/web/src/components/nest/*`
(new section components `NestStats` and answer buttons inside the tray; the eyes badge files are
removed under option A) and their tests and the Nest E2E spec. `threads.answer` is reused as is.
Nothing contacts Rakazo-owned infrastructure and no internal names change.

## Impact

- Capability: `the-nest` spec modified (mood indicator, tray) and extended (ordering, last
  activity, today).
- No Prisma migration. New reads use existing indexes: `runs` by space and bot, and `UsageRecord`
  by space, user and time. They are bounded to the caller's space and one local day.
- Security: answering uses the existing `threads.answer`, which already validates the run, the
  message and the caller. The snapshot adds option labels for plain questions only; secret asks
  keep their content out of the snapshot.
- Rollout: old web with new API still works (new fields are additive, the new input is optional).

## Out of scope

Approvals answered in place, a routines timeline, a live signal, a mobile screen, moving the Nest
to the sidebar or home, and anything else listed under phase 1's future ideas.
