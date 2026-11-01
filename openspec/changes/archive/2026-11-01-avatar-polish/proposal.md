# Proposal

## Why

Testing the avatar states on the test server turned up four rough edges. Every avatar on the page
turns to look at the cursor, and the farther the cursor is, the harder it pulls, so a distant
mouse makes the whole screen stare. The Avatar Studio offers four bodies even though a bot can
already be one of ten organic families. Chief's highlight arc pokes out of its body and its eyes
look small and off-centre. And a quick wiggle of the mouse makes every avatar dizzy too easily.

## What Changes

1. **Cursor follow only when the cursor is near.** An avatar follows the pointer only inside a
   radius of about 2.5 times its size (at least 120px). The pull is strongest at the avatar's edge
   and eases smoothly to zero at the radius; past it the avatar goes back to its idle gaze. Per-state
   strengths and the single shared pointer controller (one listener, one frame callback, two CSS
   variables) stay.
2. **All bodies selectable.** The pickers offer all ten organic families, Chief, Bean, Drift and
   Sprout (14), plus the Default chip. Existing bots keep their bodies and `seed % 10` is untouched.
   The storage options are weighed in `design.md`; the recommendation reuses the stored
   `#hex::shape_N` format with new indexes.
3. **Chief looks right.** Chief uses the storyboard's exact eye position, lean, scale, gloss arc and
   ink-body glint colors. Its own gloss replaces the bounds-derived one. A test checks that every
   body's gloss stays inside its outline, and the PR shows a contact sheet of all bodies.
4. **Dizzy takes a harder shake.** Ten direction changes within 1.5 s, each move at least 16px.
   The 2.4 s effect and the exclusions (asleep, thinking, 24px and smaller, reduced motion) stay.

## Out of scope

- The `seed % 10` hash, existing bodies and `shape_0` to `shape_11` keep their meaning.
- Mobile gets the new bodies through the shared frame and picker constants only; the mobile avatar
  states remain a separate change.
- No new visible copy. Picker chips reuse the existing "Shape {number}" accessible name.
