# Design

## Decisions

- **Deploy job lives in the publish workflow.** A final job `deploy-test` with
  `needs: publish` runs only for pushes to `main`, so it starts after all three images succeed and
  needs no cross-workflow trigger. It has no repository permissions, reads both secrets from the
  environment (never inline in the command), skips with a notice when they are empty, and fails the
  run on a non-2xx answer. It does not wait for CI: pull requests were already gated before merge.
- **Coolify authentication.** The deploy endpoint (`/api/v1/deploy?uuid=...`) answers only with a
  bearer token that has deploy permission, so a second secret is needed. Both values stay in
  Actions secrets; the runbook says where to find them in Coolify.
- **Retag, not rebuild.** `scripts/retag-commit-image.sh <image> <sha> <tag>...` runs
  `docker buildx imagetools create` from `<image>:sha-<sha>`; for one registry this copies a
  manifest, not layers. It exits with a distinct status when the source image is missing, and the
  workflow then runs the existing build step. The tags to apply are the metadata action's list
  minus the `sha-` tag, so prerelease tags still do not move `latest`.
- **Same commit, same image.** The image carries `GIT_SHA` as a build argument, which is the tagged
  commit, so a retagged image is byte-identical to the one `main` built and tested.
- **Caching unchanged.** Run timings show cached images finishing in 5 to 30 seconds and the `app`
  image taking about 1.5 minutes even for a documentation-only change, because `COPY . .` runs
  before the builds. Restructuring that Dockerfile would diverge from upstream; not worth the
  merge cost.
- **Changed-path outputs.** `scripts/ci-e2e-paths.sh` reads changed paths on stdin and prints
  `e2e=true|false`, beside `ci-docs-only.sh`. The `changes` job emits both outputs; for anything
  other than a pull request `e2e` is `true`.
- **Web E2E path list.** The requested list is `apps/web`, `apps/api`, `packages/ui-*`,
  `packages/chat-ui`, `packages/contracts`. The job also starts the worker over every shared
  package and runs the marketing site's end-to-end tests, so the script counts `apps/web`,
  `apps/api`, `apps/worker`, `apps/www`, everything under `packages/` (which includes the requested
  ones), the root build files (`package.json`, lockfile, workspace, turbo and tsconfig base, `.npmrc`,
  `patches/`) and the CI and Playwright workflows. A change elsewhere, such as `apps/mobile`,
  `apps/desktop`, `infra/` or documentation, skips it on a pull request.
- **Native computer on main only.** The job's condition becomes `github.event_name == 'push'`.
  The existing test that pins the old condition is updated.

## Risks

- If Coolify's redeploy does not pull a moved `edge` tag, the test server keeps running the old
  image. The verification task compares the server's reported commit (`/health`) with the merge
  commit; a fix would be a pull policy on the test resource only.
- A tag cut within minutes of a merge may find no `sha-` image yet (publish still running); the
  fallback build then runs, which is today's behaviour.
- Two merges in quick succession each trigger a deploy; the later one wins, which is intended.
