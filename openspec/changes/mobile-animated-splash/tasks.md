# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal. Verify: explicit approval in the session.

## 2. Build

- [ ] 2.1 Timeline data and pure helpers (keyframe interpolation, eased segments, exit gating,
  idle blink schedule) with unit tests. Verify: `vitest` on the new test file passes.
- [ ] 2.2 `BrandSplash` component: SVG mark from `brand.json`, bodies, eyes, orb gradient, pop
  rings, fireflies, bottom glow, reduced-motion path, accessibility-hidden. Verify: typecheck and
  lint pass; renders on an emulator.
- [ ] 2.3 Wire into `app/_layout.tsx` (overlay with `ready`, native splash hidden by the splash).
  Verify: cold start on an emulator shows plain navy, then the animation with no flash, then the
  app; with `ready` forced false the idle loop runs and exits once ready.
- [ ] 2.4 Native splash: blank image in `brand-expo-config.ts`, test updated, app icon untouched.
  Verify: `brand-expo-config` test passes; resolved config icon is unchanged.
- [ ] 2.5 `openspec validate mobile-animated-splash --strict`, mobile typecheck, lint, unit tests.

## 3. Before merge

- [ ] 3.1 Short screen recording (or frame screenshots) from an Android emulator, including reduced
  motion, attached to the PR. Verify: the PR links it.

## 4. After merge

- [ ] 4.1 Maintainer rebuilds the APK (native splash configuration changed).
- [ ] 4.2 Archive the change.
