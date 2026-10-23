# Proposal

## Why

Getting a merged change onto the test server takes a manual redeploy after the images are built,
and cutting a release tag rebuilds images that were already built and tested on `main`. Pull
request CI also spends runner time (four Web E2E shards, macOS and Windows jobs) on changes that
cannot affect them. This change removes the manual step, makes a release a retag, and trims CI to
what a pull request can break.

## What Changes

- **Test server on edge.** After the three images are published from `main`, the publish workflow
  calls the Coolify deploy webhook of the `nurlings-test` resource. The webhook URL comes from the
  Actions secret `COOLIFY_TEST_DEPLOY_WEBHOOK` and Coolify's API token from
  `COOLIFY_TEST_DEPLOY_TOKEN` (Coolify's deploy endpoint requires a bearer token). If either is
  missing the step is skipped with a notice. The Coolify runbook says the test server runs `edge`
  and clients always run a release tag.
- **Tags reuse images.** On a `v*` tag push the workflow does not build. It retags the existing
  `sha-<commit>` image of each of the three images as `vX.Y.Z`, `vX.Y` (and `latest` for a stable
  tag), and builds only when that `sha-` image does not exist.
- **Layer caching.** Already in place (a per-image GitHub Actions cache with `mode=max`); the
  recent runs show the `computer` and `updater` images finishing from cache in seconds. No change
  is proposed; the remaining time is the `app` image's source build, which a cache cannot skip.
- **CI speed.**
  - Per-pull-request `cancel-in-progress` already exists in `ci.yml`, `openspec-check.yml` and the
    screenshot workflows; no change.
  - Web E2E runs on a pull request only when it changes `apps/web`, `apps/api`, `packages/ui-*`,
    `packages/chat-ui` or `packages/contracts` (plus the safety paths listed in the design).
    Pushes to `main` always run it.
  - Native computer (macOS, Windows) runs on pushes to `main` only, not on pull requests.
  - Lint, Typecheck and Unit tests keep running on every pull request.
- Internal identifiers stay as they are. The only new outbound call is to the maintainer's own
  Coolify instance. Nothing contacts Rakazo-owned infrastructure.

## Capabilities

### New Capabilities

- `ci-pipeline`: which CI jobs run on pull requests and on `main`.

### Modified Capabilities

- `image-distribution`: version tags reuse the commit's images, and a push to `main` redeploys the test server.

## Impact

- `.github/workflows/publish-nurlings-images.yml`, `.github/workflows/ci.yml`,
  `scripts/retag-commit-image.sh`, `scripts/ci-e2e-paths.sh`, their tests,
  `deploy/coolify/README.md`.
- Trade-off: a regression that only the skipped jobs would catch (Web E2E on an unlisted path,
  native computer on any change) is found after merge on `main`, not on the pull request.
- Maintainer actions: add the two secrets, set `NURLINGS_VERSION=edge` on `nurlings-test`.
