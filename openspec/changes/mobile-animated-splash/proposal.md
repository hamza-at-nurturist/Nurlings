# Proposal

## Why

The mobile app opens on a plain still image. The brand has a character (Chief, the blob, and its
orb friend) and the first seconds of every launch are the one moment guaranteed to be seen, so they
should introduce it: Chief hops in, the orb rises, they look at each other, wink, hop, and boop the
screen away into the app.

## What Changes

- A new full-screen JS splash, drawn with `react-native-svg` and animated with
  `react-native-reanimated`, built from the existing brand mark paths (`brand.json` `mark.blob` and
  `mark.orb`). Navy `#03091F` background, mark about 250 px wide, centred, on one 6 s timeline
  (enter, look, blink, wink, hop, boop exit, pop rings), plus eight softly glowing fireflies and a
  faint bottom glow.
- The native splash becomes a plain `#03091F` screen with no image, so it matches the first frame
  of the animation exactly. It is hidden as soon as the JS splash is on screen.
- The animation plays once. Its exit ("boop", from 84%) only plays when the app is ready; if the
  app is not ready by 82% the splash idles calmly (both characters blink every few seconds,
  fireflies keep rising) and exits when it is. It then fades straight into the app.
- With reduced motion on, the splash is the static mark for about 600 ms, then the app.
- The app icon is unchanged.
- No new words on screen. The splash is decorative and hidden from screen readers.

### Not changed, on purpose

- App icon, adaptive icon, notification icon: untouched.
- No tests for the animation's pixels; it is checked on an emulator (screen recording or frame
  screenshots go on the PR before merge). Pure timing helpers get unit tests.
- No dependency changes: `react-native-svg` and `react-native-reanimated` are already installed.

### Upstream merge safety

New files wherever possible. Edits to existing files:

| File | Edit | Owner |
|---|---|---|
| `apps/mobile/app/_layout.tsx` | render the splash over the app and hand it `ready`; native splash is hidden by the splash itself | upstream |
| `apps/mobile/lib/brand-expo-config.ts` (+ its test) | native splash uses a blank image so Android 12+ shows plain navy | fork |

New: `apps/mobile/components/brand-splash/` (component, timeline data, fireflies, reduced-motion
path), a blank splash PNG, and tests for the timeline helpers.

Nothing here contacts Rakazo-owned infrastructure.

## Impact

- Capability: new `mobile-splash` spec.
- Every cold start now shows the splash for at least about 5 s (the exit starts at 84% of 6 s), even
  when the app is ready sooner. This is what the brief asks for; reduced motion is the short path.
- Needs a new native build (the native splash configuration changes); it cannot ship over the air,
  and OTA is off anyway. Maintainer rebuilds the APK after merge.
