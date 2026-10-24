# Proposal

## Why

The first Android APK build failed on EAS: the slug of the linked Expo project (`nurlings`) does
not match the `slug` field in `apps/mobile/app.json` (`rakazo`), so no build can start. Expo
requires the two to agree.

## What Changes

- `apps/mobile/app.json`: `slug` becomes `nurlings`.
- The `app-identity` requirement that froze the Expo slug now freezes only the `rakazo://` URL
  scheme, the desktop application id and the Linux executable name. `openspec/project.md` and
  `openspec/config.yaml` stop listing the Expo slug among the names that stay.
- The `brand-expo-config` test no longer expects the slug to equal upstream's and pins `nurlings`.

The slug is used nowhere else: not in an update URL (updates are off and carry no URL), not in the
URL scheme, not in the Maestro flows, CI or docs. It only appears as the project identifier
inside `app.json` and, for development builds, in the Expo dev-client link scheme. The
`rakazo://` URL scheme is untouched, so sign-in redirects keep working. Merging upstream changes
to `app.json` can now conflict on this one line, which is a one-line resolution.

Contacts Rakazo-owned infrastructure: no.

## Impact

- Capability: `app-identity`.
- After merge the maintainer reruns `release-android-apk`.
- No server change, no migration, no new dependency.
