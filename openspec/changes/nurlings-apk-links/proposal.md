# Proposal

## Why

The README and the marketing site still send people who want the Android app to the upstream
repository's `rakazo.apk`. The Nurlings APK workflow now publishes `nurlings.apk` on this
repository's rolling `android` release, so the download links should point there.

## What Changes

- README: the "Download the Android APK" badge and the Android link in the intro point to
  `https://github.com/hamza-at-nurturist/Nurlings/releases/download/android/nurlings.apk`.
- `apps/www/src/site.ts`: `ANDROID_APK_URL` points to the same URL.

No visible words change; only link targets. Not changed: every other `elie222/rakazo` link
(stars badge, clone and install commands, docs and blog links, the repository card), the iOS App
Store link, and the product UIs, whose Android download entry stays unset by default.

Contacts Rakazo-owned infrastructure: this removes one link to it.

## Impact

- Capability: none; the README and marketing site are outside the white-label specs.
- The link returns 404 until the maintainer has run `release-android-apk` once, so merge this
  after that run.
- No code logic, no test (marketing pages are checked with a build), no migration.
