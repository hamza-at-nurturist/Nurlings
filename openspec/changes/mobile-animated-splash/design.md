# Design

## Decisions

1. **One progress value, derived styles.** A single reanimated shared value runs 0→1 over 6 s
   (linear). Every part (body, eyes, orb, rings) is an animated style that interpolates the
   percentage keyframes from the brief, held as plain data in a timeline file. This keeps all
   timings in one place and makes the 82% hold trivial (stop the clock, loop the idle).
2. **SVG transforms in user units.** Parts are `Animated` `G` elements (react-native-svg) driven
   through `useAnimatedProps`. Squash/hop pivot is the part's bottom centre and blinks pivot on the
   eye centre, expressed as translate(pivot) · transform · translate(-pivot) in the 237 574 1585 898
   viewBox. Eye centres and bottom centres are computed once from the path bounds.
3. **Shapes from `brand.json`.** `mark.blob` is split into subpaths (body + two eyes);
   `mark.orb` into the disc and two eyes. The orb disc is drawn as a circle (1591.3, 846.5, r 190.6)
   with the brand orb gradient (`mark.orbGradient`, `colors.orbGradient`), eyes in navy on top. No
   path data is copied into the component.
4. **Exit gating.** Timeline runs 0→82% unconditionally. At 82% it checks `ready`: if true it
   continues straight to 84%+; if not, it enters a calm idle (blink every ~3 s, fireflies continue)
   and leaves the idle at the next blink boundary once `ready` turns true, then plays 84%→100%.
   Then the splash fades out over the app (about 250 ms) and unmounts.
5. **`ready`.** The layout's existing readiness (`ready && appearanceReady`) is the signal; the
   splash is rendered over the app tree, so the app mounts underneath while the exit plays.
6. **Native splash.** The expo-splash-screen plugin option `image` is pointed at a fully
   transparent PNG (a missing image would let Android 12+ draw the launcher icon on the splash).
   Background already comes from `brand.colors.splashLight/Dark` = `#03091F`. The splash hides in
   the splash component's first layout, replacing the existing wait for `appearanceReady && ready`.
7. **Fireflies.** Eight dots, 2–4 px, colours `#4FFFDB`, `#6AAEF6`, `#8F7AFB`, 45% alpha glow
   (a larger low-alpha circle behind the dot, no blur filter), max opacity .55. Each rises from
   below the screen to above it over 14–21 s with a sideways drift (+14 then −10), using fixed,
   hand-picked parameters (no `Math.random`, so every launch and every test is identical), with
   negative start offsets so some are mid-screen at frame 0. A very faint radial glow (12%) sits at
   the bottom.
8. **Reduced motion.** `AccessibilityInfo`/`useReducedMotion`: static mark (rest pose, both pairs
   of eyes open), ~600 ms minimum, then exits as soon as ready. No fireflies.

## Risks

- Reanimated worklets on SVG props at 60 fps with ~20 animated nodes: fine on modern devices,
  to be verified on an emulator. If frames drop, fireflies become a single layer.
- `ready` can arrive before 82% on every normal launch, so the idle path is exercised only on slow
  starts. It is covered by a unit test of the timeline helper and by forcing `ready=false` on the
  emulator.

## Verification

Unit tests for the keyframe interpolation and the gating helper (pure functions). Typecheck and
lint. Emulator recording (or frame screenshots at ~0, 6, 14, 25, 45, 55, 70, 90, 96%) attached to
the PR before merge.
