# Proposal

## Why

A change to how the Android app starts can only be judged on a real phone, but the only APK build
publishes over the real app's release from `main`. A bad build then replaces the working app (this
just happened with the animated splash). A test build of a branch must install next to the real
app, publish somewhere else, and leave the main release alone.

## What Changes

- `release-android-apk` gets a `preview` input. A preview run may start from any branch, builds with
  a new EAS profile `android-preview-apk`, and publishes `nurlings-preview.apk` on a separate
  prerelease `android-preview`. The main release (`android`, `nurlings.apk`) is untouched, and
  previews use their own concurrency group.
- The preview app has its own Android package `com.nurturistai.nurlings.preview` and the name
  "Nurlings Preview", so it installs next to the real app instead of replacing it. It is selected
  by `NURLINGS_PREVIEW=1`, set only by the new EAS profile.
- A preview build does not use the Firebase file, which belongs to the real package. Push
  notifications are therefore not expected to work in the preview app.

### Not changed, on purpose

- iOS identity, the `rakazo://` URL scheme (shared, so Android may ask which app opens a link) and
  passkeys (tied to the real package) are not changed.
- No new copy in the app. The only new words are the app's launcher name "Nurlings Preview", which
  is the point of the change, and release notes on the prerelease.

### Upstream merge safety

| File | Edit | Owner |
|---|---|---|
| `apps/mobile/eas.json` | one new build profile | upstream |
| `apps/mobile/app.config.ts` | preview switch, profile name, skip Firebase file | upstream |
| `.github/workflows/release-android-apk.yml` | `preview` input, parameterised names | fork |
| `apps/mobile/lib/brand-expo-config.ts` (+ tests) | `previewIdentity` | fork |

Nothing here contacts Rakazo-owned infrastructure. CI creates the `android-preview` release and
tag itself; no one pushes a tag by hand.

## Impact

- Capability: `ci-pipeline` (one added requirement).
- Costs one EAS build per preview run, started by hand.
