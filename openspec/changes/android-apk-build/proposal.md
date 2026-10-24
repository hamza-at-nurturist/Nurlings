# Proposal

## Why

The Android APK workflow cannot build Nurlings yet. `apps/mobile/app.json` still has placeholders
for the Expo owner and EAS project, so every release build stops at the placeholder check, and the
workflow still names Rakazo: the APK file, the release title and the missing-token message, which
points at the upstream Expo project. The Nurlings Expo project now exists, is linked to this
repository, and the `EXPO_TOKEN` repository secret is set, so the placeholders can be filled and
the workflow can be run.

## What Changes

- `apps/mobile/app.json`: `owner` becomes `nurturist-ai` and `extra.eas.projectId` becomes the
  Nurlings EAS project id (`aa1a8375-7dea-4dc7-a6ba-d42968e9f40f`). Both are public identifiers,
  not secrets. The Android package stays `com.nurturistai.nurlings`.
- `release-android-apk.yml`: the APK is `nurlings.apk` (download name, staged name and release
  asset), the release title is "Nurlings for Android <version> (<code>)", and the missing-token
  message names the `nurturist-ai` Expo project instead of `inbox-zero/rakazo`.
- Release notes and the workflow comments no longer say the APK updates itself over the air or
  receives the same updates as store builds. Over-the-air updates stay off in the rebrand
  (`brand.updates.mobileOta` is unchanged, and the build config still ships no update URL), so
  that sentence would be false. New release note, the only visible copy added:
  "Install nurlings.apk on your Android phone." It replaces the old sentence and says nothing
  more because the file name is the whole instruction.
- `docs/mobile-release.md`: the Android APK section uses this repository's `nurlings.apk` link and
  drops the over-the-air claim for the APK.
- Tests: the placeholder test in `brand-expo-config.test.ts` now expects the real owner and
  project id and no placeholders; `release-apk-workflow.test.ts` pins the `nurlings.apk` name, the
  title and the message, and that no `rakazo` or `inbox-zero` text remains in the workflow.

Not changed: `slug` and the `rakazo://` scheme (internal names kept for upstream merges), the
`android-apk` EAS profile and its `production` channel (the channel only matters if updates are
turned on later), the placeholder check itself (it still blocks a build if a placeholder returns),
README and website download links (out of scope for white-labelling and they point at the upstream
repository; say if you want them re-pointed), and the pinned actions.

Contacts Rakazo-owned infrastructure: no. The workflow now talks only to the `nurturist-ai` Expo
account and this repository's releases.

## Impact

- Capabilities: `app-identity` (Expo ownership requirement), `ci-pipeline` (APK release).
- After merge the maintainer runs `release-android-apk` from `main`; the first run publishes the
  rolling `android` release at
  `https://github.com/hamza-at-nurturist/Nurlings/releases/download/android/nurlings.apk`.
- The first EAS build creates the project's managed Android keystore. Keep it: a later keystore
  change would force users to uninstall the app.
- Firebase push is not configured here, so the APK builds without Android push as documented.
- No migration, no server or web change, no new dependency.
