# Tasks

## 1. Approval

- [x] 1.1 Maintainer asked for exactly this (separate package and name, branch builds to a
  separate prerelease). Verify: the request in the session.

## 2. Build

- [x] 2.1 `previewIdentity`, the `android-preview-apk` profile and the app config switch, with
  tests. Verify: `vitest` on `app-config` and `brand-expo-config` passes.
- [x] 2.2 Workflow `preview` input with its own tag, asset name, prerelease flag and concurrency
  group; the main path keeps its names. Verify: workflow YAML parses; a manual preview run from a
  branch publishes `nurlings-preview.apk` on `android-preview` and does not touch `android`.
- [x] 2.3 `openspec validate android-preview-build --strict`.

## 3. After merge

- [x] 3.1 Archive the change.
