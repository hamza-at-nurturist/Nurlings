# Proposal

## Why

Chief wears the brand blob (`nurling`, shape 8), but on web its eyes are static while an organic
avatar's eyes drift, blink and change when the bot is working. The shipped shapes' eyes have no
animation on web, so Chief looks lifeless next to the organic avatars around it. Mobile already
animates every shape's eyes through the shared `eyeState` worklet, so this is a web-only gap.

## What Changes

The nurling shape's eyes on web get the organic avatars' eye behaviour, keeping the slanted pills.

- **Same idle patterns, seeded per bot.** `data-eye-pattern` comes from `avatarIdentitySeed(identity)
  % 4`, the same seed `OrganicAvatar` uses, so the four `rakazo-eyes-idle-N` patterns and their
  blinks apply unchanged.
- **Same working-state eyes.** The eyes are drawn as an idle group and a working group, swapped on
  `data-working`, using the existing `rakazo-organic-eyes-loop-N` keyframes.
- **Same reduced motion.** The existing `prefers-reduced-motion` rule stops the eye animations.
- **No duplicated keyframes.** The CSS selectors that hang off `.rakazo-organic-avatar` are widened
  to also match a new `.rakazo-shape-eyes` host class; the keyframes are untouched. Keeping the
  organic class organic-only matters because tests and the studio use it to tell an organic body from a
  shape.
- **Units.** The idle keyframes move the eyes by a few pixels in a 120-unit box, but shapes use a
  259-unit view box. The eyes are drawn inside a wrapper scaled by 259/120 so the same keyframes
  produce the same relative motion, and they blink about their own centre (`transform-box:
  fill-box; transform-origin: center`), which the shapes' off-centre eyes need.
- The picker previews (`BotShapePreview`) stay static.
- **Mobile: no change.** `ShippedShapeAvatar` already animates every shape's eyes, pills included,
  with the shared life clock (blink, look, working).

## Optional: the eight classic shapes

Not part of this change unless you say so. The eyes are drawn by one shared component, so enabling
the animation for the classic shapes is removing a condition rather than new code; the cost is in
effects, not effort:

- Every shaped avatar on web gets four animated eye shapes (idle and working groups) instead of two
  static ones, the same cost organic avatars already pay in long lists.
- Every existing shaped avatar visibly changes for every user. That is a product decision, and it
  would also be the first time ellipse eyes play keyframes written for tall pills; the blink works,
  and the working loops need a visual check.
- Tests and screenshots: the classic shapes need the same e2e assertions and a re-captured screenshot.
- Mobile unaffected.

I recommend shipping nurling alone first and deciding on the classics once you've seen it move.

## Risks

1. A CSS selector widening touches the organic rules; a unit test pins that organic avatars still
   render the same classes and that the studio's organic-versus-shape checks still hold.
2. Eye offsets scaled by the wrapper could clip at small sizes; verified by recording at 36, 42 and
   54 px.
3. A screen recording is not possible here (no ffmpeg), so the evidence is a GIF built from
   timed screenshots of the real fixture.

## Impact

- Capabilities: `user-facing-branding` (adds a requirement for the brand blob's eye animation).
- Contacts Rakazo-owned infrastructure: no.
- Database: no.
