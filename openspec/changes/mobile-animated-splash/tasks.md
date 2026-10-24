# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal (with the first-launch / short / tap-to-skip change). Verify: explicit approval in the session.

## 2. Build

- [x] 2.1 Timeline data and pure helpers (keyframe sampling, phase planning for full / short /
  static, mark geometry) with unit tests. Verify: `vitest` on the new test file passes.
- [x] 2.2 `BrandSplash` component: SVG mark from `brand.json`, bodies, eyes, orb gradient, pop
  rings, fireflies, bottom glow, reduced-motion path, accessibility-hidden. Verify: typecheck and
  lint pass; renders on an emulator.
- [x] 2.3 Wire into `app/_layout.tsx` (overlay with `ready`), first-launch flag, tap to skip.
  Verify: Android bundle export succeeds; behaviour checked on the maintainer's phone.
- [x] 2.4 Native splash: blank image in `brand-expo-config.ts`, test updated, app icon untouched.
  Verify: `brand-expo-config` test passes; resolved config icon is unchanged.
- [x] 2.5 `openspec validate mobile-animated-splash --strict`, mobile typecheck, lint, unit tests.

## 3. After merge

- [ ] 3.1 Maintainer rebuilds the APK (native splash configuration changed) and checks the first
  launch, a later launch, tap to skip and reduced motion on a phone; fixes go in a follow-up.
- [ ] 3.2 Archive the change.
