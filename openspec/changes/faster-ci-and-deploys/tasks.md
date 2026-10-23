# Tasks

> Scope: workflows, two small scripts, their tests and the Coolify runbook. No application code.
> Nothing is committed before the maintainer approves this proposal (task 1.1).

## 1. Approval

- [x] 1.1 Maintainer approves the proposal. Verify: explicit approval in the session.

## 2. Tags reuse images

- [x] 2.1 Add `scripts/retag-commit-image.sh` (retag from `sha-<commit>`, distinct exit status when the source is missing) with a vitest file using a stubbed `docker`. Verify: tests cover retag with several tags, missing source, and a failing `docker`.
- [ ] 2.2 In `publish-nurlings-images.yml`, retag on `v*` tags and build only on `main`, manual runs, or when the retag reports a missing source. Verify: a workflow test asserts the step conditions; the first tag after merge shows no build step and the version tags on the same digest as `sha-<commit>`.

## 3. Test server redeploy

- [x] 3.1 Add the `deploy-test` job (main pushes only, `needs: publish`, no repository permissions, secrets read from the environment, skip with a notice when unset). Verify: a workflow test asserts the trigger, `needs`, permissions and that neither secret appears inline; the run on this PR's merge to `main` calls the webhook once and the `api` container reports the merge commit as its `revision`. Verified: the merge run called the webhook (HTTP 2xx) and the test server reported the merge commit.
- [x] 3.2 Add a "Test server" section to `deploy/coolify/README.md`: the test server runs `edge`, clients always a release tag, where to find the webhook and token in Coolify, and the two secrets. Verify: the existing runbook guard tests pass and the section names both secrets.

## 4. CI speed

- [x] 4.1 Add `scripts/ci-e2e-paths.sh` and an `e2e` output on the `changes` job; make Web E2E depend on it for pull requests. Verify: script tests for listed, unlisted, empty and docs-only inputs; workflow test that pushes always run it.
- [x] 4.2 Run Native computer on pushes only and update the pinned expectation in `ci-docs-only.test.ts`. Verify: workflow test; Lint, Typecheck and Unit tests stay unconditional.

## 5. Review and measure

- [x] 5.1 `openspec validate faster-ci-and-deploys --strict`, `pnpm lint` and the updater tests pass. Verify: commands succeed.
- [ ] 5.2 After merge, record merge-to-live and tag-to-release times from the Actions timestamps and the `revision` the `api` container reports. Verify: numbers reported to the maintainer.
- [ ] 5.3 Open the PR from `chore/faster-ci-and-deploys`, merge when green, then archive in its own PR. Verify: change under `openspec/changes/archive/`, specs updated.
