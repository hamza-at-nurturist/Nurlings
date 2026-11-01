# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and the picker option in `design.md`. Verify: explicit
  approval in the session. No code before this.

## 2. Cursor follow

- [ ] 2.1 Add pure `avatarFollowRadius(size)` and `avatarFollowPull(distance, size)` to core and use
  them in the pointer controller, replacing `AVATAR_FOLLOW_RANGE`. Verify: unit tests for the
  radius floor and 2.5x rule, 1 at the edge, 0 at and beyond the radius, monotonic in between.
- [ ] 2.2 Update the controller tests. Verify: an avatar near the pointer follows, a far one stays at
  zero, still one listener and one frame callback.

## 3. Dizzy

- [ ] 3.1 Set the detector to 10 turns, 1500 ms, 16px. Verify: updated detector tests, including a
  quick six-turn wiggle that no longer fires.

## 4. Chief and gloss

- [ ] 4.1 Chief frame uses the storyboard eye values, gloss arc and ink glint colors. Verify: frame
  test for eye centres and tilt; render test for the ink glint.
- [ ] 4.2 Check derived gloss on every body. Verify: a test that sampled gloss points lie inside each
  body's outline (hashed families, Chief, Bean, Drift, Sprout); fix the derivation where it fails.

## 5. Shape picker

- [ ] 5.1 Add `shape_12..21` (family 0..9) to `BOT_AVATAR_SHAPE_COUNT`, the frame function and
  `PICKABLE_ORGANIC_SHAPE_INDEXES`. Verify: existing bots' bodies unchanged (`shape_0..11` and plain
  colors render as before), pinned family equals the family path, parser round trip.
- [ ] 5.2 Web Studio and create dialog use the 14 chips in a wrapping grid; mobile settings wraps the
  chips. Verify: component tests; Default chip still selected for plain colors and `shape_0..7`.
- [ ] 5.3 Contact sheet fixture of every body at 96px with its gloss. Verify: E2E screenshot.

## 6. Wrap-up

- [ ] 6.1 `openspec validate avatar-polish --strict`, typecheck, lint, unit tests, Lingui catalogs.
- [ ] 6.2 PR with why/what/how tested, E2E screenshot, plain-words title. Archive
  `avatar-working-states` first, then this change, after merge.
