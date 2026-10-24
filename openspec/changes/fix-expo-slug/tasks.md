# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for the slug in `apps/mobile/app.json` to become `nurlings`, keeping the
  `rakazo://` scheme. Verify: explicit request in the session.

## 2. Fix

- [x] 2.1 Set `slug` to `nurlings`, update the slug test, and update the identity notes in
  `openspec/project.md` and `openspec/config.yaml`. Verify: `vitest` on
  `brand-expo-config.test.ts` passes, including the check through Expo's real config loader.
- [x] 2.2 `openspec validate fix-expo-slug --strict`, lint and typecheck pass.

## 3. After merge

- [ ] 3.1 Maintainer reruns `release-android-apk`. Verify: the "Build APK on EAS" step passes.
- [ ] 3.2 Archive the change.
