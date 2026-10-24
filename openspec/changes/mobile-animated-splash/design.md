# Design

## Decisions

1. **One progress value, derived styles.** A single reanimated shared value runs 0→1 over 6 s
   (linear). Every part (body, eyes, orb, rings) is an animated style that interpolates the
   percentage keyframes from the brief, held as plain data in a timeline file. This keeps all
   timings in one place and makes the 82% hold trivial (stop the clock, loop the idle).
2. **Layered views, not animated SVG props.** Each part (body, eyes, orb disc, rings) is its own
   `react-native-svg` layer in the shared view box, wrapped in a reanimated `Animated.View` whose
   transform is set from the keyframes (translate, rotate, scale, `transformOrigin` at the bottom
   centre or the eye centre). Eyes are nested inside their body's view so they squash and hop with
   it. This keeps the animation on plain view transforms, which are reliable on both platforms,
   instead of animating SVG element props. Eye centres and bottom centres are computed once from the
   path bounds.
3. **Shapes from `brand.json`.** `mark.blob` is split into subpaths (body + two eyes);
   `mark.orb` into the disc and two eyes. The orb disc is drawn as a circle (1591.3, 846.5, r 190.6)
   with the brand orb gradient (`mark.orbGradient`, `colors.orbGradient`), eyes in navy on top. No
   path data is copied into the component.
4. **Modes.** `full` (first launch after install), `short` (later launches), `static` (reduced
   motion). The mode is chosen synchronously from a flag file in `Paths.document` (not the keychain,
   which survives an iOS uninstall), written when the full run starts. Unreadable storage counts as
   "seen". In `short` mode the base clock stops at 29% (Chief landed, orb settled, about 1.7 s) and
   the exit starts the moment the app is ready, even mid-pop-in: the exit is a second clock that
   multiplies the body scale, so it needs no particular base pose. A tap sets `skipped`, which
   starts the exit immediately in any mode. A pure `planSplash` function decides playing / idle /
   exit from mode, elapsed time, `ready` and `skipped`.
   **Exit gating (full).** Timeline runs 0→82% unconditionally. At 82% it checks `ready`: if true it
   continues straight to 84%+; if not, it enters a calm idle (blink every ~3 s, fireflies continue)
   and leaves the idle at the next blink boundary once `ready` turns true, then plays 84%→100%.
   Then the splash fades out over the app (about 250 ms) and unmounts.
5. **`ready`.** The layout's existing readiness (`ready && appearanceReady`) is the signal; the
   splash is rendered over the app tree, so the app mounts underneath while the exit plays.
6. **Native splash.** The expo-splash-screen plugin option `image` is pointed at a fully
   transparent PNG (a missing image would let Android 12+ draw the launcher icon on the splash).
   Background already comes from `brand.colors.splashLight/Dark` = `#03091F`. The splash component
   hides the native splash on its first layout; the layout's own hide (after the app is ready)
   stays and is then a no-op.
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
  starts. It is covered by a unit test of `planSplash`.
- The motion has not been seen running before merge (no emulator); see Verification.

## Verification

Unit tests for the keyframe sampling, the phase planning and the mark geometry (pure functions).
Typecheck, lint, and an Android bundle export. The motion itself is checked by the maintainer on a
phone after the APK rebuild; fixes follow in a separate PR.
