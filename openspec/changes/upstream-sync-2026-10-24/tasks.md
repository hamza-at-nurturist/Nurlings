# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves this proposal, including the conflict resolutions, the removal of
  `updates.serverSelfUpdate` and the decision not to port Postgres 18 or the new healthchecks to
  Coolify in this change. Verify: explicit approval in the session.

## 2. Merge

- [ ] 2.1 Merge `upstream/main` with a merge commit into this branch and resolve the conflicts as
  listed in the proposal. Verify: no conflict markers remain and `git log` shows upstream's
  commits.
- [ ] 2.2 Remove the dead `updates.serverSelfUpdate` flag and any code left unreferenced by the
  resolutions. Verify: typecheck finds no unused imports or missing exports.
- [ ] 2.3 Run `pnpm brand:check`, then a web build and `pnpm brand:check --built`, and fix every
  new upstream string or asset that shows "Rakazo" to users. Verify: both checks pass.
- [ ] 2.4 Confirm what we keep survived: brand package and config, logos and wordmark, "Powered by
  Nurturist AI", Coolify files and their tests, CI and OpenSpec workflow, `AGENTS.md`, ticket
  prefix `NUR`, the takeover booting fix, the Expo slug `nurlings`, owner `nurturist-ai` and OTA off.
  Verify: the existing tests for each pass.

## 3. Verify

- [ ] 3.1 `pnpm install --frozen-lockfile`, lint, typecheck and unit tests pass locally.
- [ ] 3.2 `openspec validate upstream-sync-2026-10-24 --strict` passes.
- [ ] 3.3 Open the PR with the final conflict list and resolutions; CI is green on the head commit
  (the desktop e2e runs in CI, not locally). The PR links the CI e2e screenshot of the new
  create-bot dialog. Verify: `pr-digest --watch` reports terminal green checks.

## 4. After merge

- [ ] 4.1 Maintainer decides on the follow-ups: Postgres 18 for Coolify, and the healthcheck and
  `webassets` volume. Verify: follow-up changes opened or declined.
- [ ] 4.2 Archive the change.
