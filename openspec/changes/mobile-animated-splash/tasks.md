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

## 3. First landing (#39), reverted (#40)

- [x] 3.1 Root cause found on the CI Android emulator (release build, data cleared): a default
  parameter in the `sampleTrack` worklet threw a `ReferenceError` on the UI thread and React Native
  tore down the app (navy, no mark, then grey). Verify: logcat from the emulator run.

## 4. Re-land

- [x] 4.1 Worklets take every argument explicitly; the animated-style math moves into the timeline
  module as worklets. Verify: typecheck, lint and splash unit tests pass.
- [x] 4.2 Worklet test: compile with the app's worklets Babel plugin, run each worklet from its
  serialized code with only its captured values, reject default parameters in timeline and
  component worklets, and prove the harness catches the original bug. Verify: the test fails when
  the #39 default parameter is put back.
- [ ] 4.3 CI Android emulator run on the branch reaches sign-in after a data-cleared launch with
  reduced motion, and the splash shows the mark. Verify: workflow run and its screenshots.
- [ ] 4.4 Preview APK built from the branch (`release-android-apk`, `preview`). Verify:
  `nurlings-preview.apk` on the `android-preview` prerelease.
- [ ] 4.5 Maintainer confirms on a phone: first launch plays the full animation, a later launch the
  short pop-in, a tap skips, reduced motion shows the static mark, and the app always reaches
  sign-in or the chats. Verify: maintainer's confirmation in the PR.
- [ ] 4.6 `openspec validate mobile-animated-splash --strict`, mobile typecheck, lint, unit tests.

## 5. After merge

- [ ] 5.1 Archive the change.
