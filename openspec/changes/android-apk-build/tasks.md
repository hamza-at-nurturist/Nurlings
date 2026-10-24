# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves this proposal. Verify: explicit approval in the session.

## 2. Config and workflow

- [x] 2.1 Fill `owner` and `extra.eas.projectId` in `apps/mobile/app.json`, and update the
  placeholder test to expect the real values and no placeholders. Verify: `vitest` on
  `brand-expo-config.test.ts` passes.
- [x] 2.2 In `release-android-apk.yml`, rename the APK and release title to Nurlings, fix the
  missing-token message, and drop the over-the-air claims from the notes and comments. Extend
  `release-apk-workflow.test.ts` to pin the name, title, message and absence of `rakazo` /
  `inbox-zero`. Verify: `vitest` on `release-apk-workflow.test.ts` passes.
- [x] 2.3 Update the Android APK section of `docs/mobile-release.md`. Verify: read-through; the
  link and file name match the workflow.
- [x] 2.4 `openspec validate android-apk-build --strict`, lint, mobile typecheck
  (`pnpm --filter @rakazo/mobile check`) and the mobile unit tests pass.

## 3. After merge

- [ ] 3.1 Maintainer runs `release-android-apk` from `main`. Verify: the Actions run is green and
  the `android` release carries `nurlings.apk`.
- [ ] 3.2 Archive the change.
