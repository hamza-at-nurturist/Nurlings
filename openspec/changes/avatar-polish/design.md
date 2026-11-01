# Design

Only item 2 (the shape picker) has a real decision; the other three are numeric changes.

## What exists

- A bot's body is chosen by `seed % 10` over its id (ten families, two of them near-identical round
  blobs, one a heart). Nothing stored says which family: it is derived.
- Stored `#hex::shape_N`: `0..7` are retired static shapes that now render the bot's own hashed
  body; `8` is Chief, `9..11` are Bean, Drift and Sprout, each with its own outline and eyes.
- The parser does `N % BOT_AVATAR_SHAPE_COUNT` (12). The server accepts any `shape_<digits>`.
- Studio shows Default plus `PICKABLE_ORGANIC_SHAPE_INDEXES` (8..11). Mobile settings shows the same
  list. The create-bot dialog shows ten sample identities instead, so a new bot's id can be minted
  to match a family.

## Options for choosing a family explicitly

### A. Repurpose `shape_0..7`
Cheapest, but those values are already stored on real bots as "my own hashed body". Reusing them
changes those bots' looks. Rejected by the constraints.

### B. New indexes in the same format: `shape_12..21` = family 0..9 (recommended)
`#hex::shape_{12+f}` pins family `f`. The body is the family's outline at a fixed phase, with the
standard pill eyes. `BOT_AVATAR_SHAPE_COUNT` grows from 12 to 22. Nothing stored changes meaning:
no existing value is in 12..21, and the server already accepts any digits.

- Bot that stored `shape_0..7`: unchanged. It still draws its own hashed body and its Default chip
  stays selected. None of the 14 chips is selected for it.
- Old mobile build opening `shape_12..21`: its parser takes `N % 12`, so 12..19 read as `0..7` (the
  bot's own hashed body) and 20, 21 read as `8`, `9` (Chief, Bean). The color is right and nothing
  crashes; only the body differs until the build updates. No numbering avoids this entirely.
- Old web build: same parser, same result.
- Cost: one constant, one frame branch, no migration, no contract change, no new token.

### C. A new token such as `#hex::body_F`
Semantically cleaner (a family, not a shape number) but the server's `SHAPE_SUFFIX` check would
reject it until deployed, and an old client's parser sees an unknown suffix and falls back to a
plain color. That is a wider break than B for no user gain.

### D. Store the family in a new bot field
A schema change plus a migration for something the existing string already carries. Rejected.

**Recommendation: B.** It keeps every existing bot's look, needs no migration and degrades safely.

## Picker layout

14 chips wrap in a fixed-width grid (7 per row) on web, inside the popover with no inner scroll. On
mobile the chips wrap in the existing vertically scrolling modal instead of one long horizontal
strip. The Default chip stays first. The create-bot dialog drops its ten sample identities and uses
the same 14 chips, so new and existing bots share one list; its heart exclusion goes away because the
heart is now an explicit choice.

## As built

- The create-bot dialog keeps its random starting look (a preview body whose family it sends so the
  server mints a matching id); the chips only apply when someone picks one, and Default returns to
  the preview body.
- No picker ever wrote `shape_12` or higher, so no stored bot is affected by the range growing.
- The derived gloss now follows the outline (outermost edge point on rays from the centre, stepped
  in 7 units) instead of using the bounding box, and a test checks every hashed family at every
  phase plus Chief, Bean, Drift and Sprout against the outline with room for the stroke.
- Chief's ink glint is stored on its frame and applies whatever color the Chief is.

## Other items

- **Follow:** `pull = smoothstep((R - d) / (R - size/2))` with `R = max(120, 2.5 * size)` and `d` the
  distance from the avatar centre, so it is 1 at the edge and 0 at `R`. Pure helpers live in core.
- **Chief:** eyes at `[6, -11]`, lean `-13`, scale `0.72` applied to the storyboard pills
  (`9x20`, centres at +-13); gloss `M-14 -17 C-11 -24 -5 -27 2 -27`; on an ink body the eye catch is
  ink and the gloss is the page background at 0.16 opacity. Other bodies keep their derived gloss,
  checked to lie inside the outline by a test (the bounds-based arc can leave the outline on bodies
  with a notch).
- **Dizzy:** constants only: 10 turns, 1500 ms, 16px.
