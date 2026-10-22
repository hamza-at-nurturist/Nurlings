# Tasks

> Scope: `deploy/coolify/` (compose file and README) plus one guard test, and the worker health
> probe if open question 1 is answered "(a)". No change to `infra/compose`. Internal identifiers
> stay. Nothing is written under `deploy/coolify/` until the proposal is approved. One small commit
> per task or tight group; "Verify" is what proves it. Environment note: this sandbox has no Docker
> daemon, so only `docker compose config` can run here; running the stack is task 5.

## 1. Facts to settle before writing the file

- [ ] 1.1 Resolve open questions 1-4 in `design.md` with the maintainer and update `design.md` and these tasks to match. Verify: `openspec validate add-coolify-deployment --strict` passes and `design.md` has no unanswered question that changes the file.
- [ ] 1.2 Confirm the accepted `ENCRYPTION_KEY` and `ENCRYPTION_MASTER_KEYS` formats and that a 64-character alphanumeric value passes `packages/core/src/secrets-guard.ts` and the encryption code. Verify: a unit test (or a recorded run of the existing guard tests) that feeds a 64-character alphanumeric key.

## 2. Worker health probe (only if open question 1 is "(a)")

- [ ] 2.1 Bring in the upstream worker health probe with its test and wire `dist/health-check.js` into the build output. Verify: `pnpm --filter @rakazo/worker test` and `build` pass and the built `dist/health-check.js` exits 0 against a local Postgres and 1 without one.

## 3. Compose file

- [ ] 3.1 Create `deploy/coolify/docker-compose.yml` from `docker-compose.images.yml`: remove `ports`, `name:` and the `updater`/profile pieces; add `NURLINGS_VERSION` pinning, `SERVICE_FQDN_WEB_5173`, URL variables, generated secrets (`SERVICE_PASSWORD_*`), named volumes, `exclude_from_hc` on one-shot services, healthchecks on every long-running service (worker per 2.1 or the fallback probe), docker.sock on `supervisor` only. Verify: `docker compose -f deploy/coolify/docker-compose.yml config` succeeds with a sample env that sets `NURLINGS_VERSION` and the Coolify-generated names, and fails with a message naming `NURLINGS_VERSION` when it is unset.
- [ ] 3.2 Add the guard test (design decision 9) in `infra/updater/src/`. Verify: it passes now, and fails when each of these is temporarily introduced and reverted: a `ports` entry, a `latest` tag, a literal secret, a second docker.sock mount, an unread env key, a missing required env key, the upstream registry, and an `updater` service.
- [ ] 3.3 Run the existing checks. Verify: `pnpm brand:check` and `pnpm --filter ./infra/updater test` pass; `git grep -niE "rakazo" -- deploy/coolify` lists only the internal env keys and the `rakazo_app` role comment, and no image, domain or value.

## 4. Runbook

- [ ] 4.1 Write `deploy/coolify/README.md` with the eight sections from the spec (requirements with RAM per bot and a Docker Engine 26+ check, machine-user `docker login`, DNS, Coolify steps, env table with optional marked, upgrade/rollback, backup/restore including `ENCRYPTION_KEY`, common problems). Verify: a test (or checklist in the PR) that every variable the compose file marks `:?` or documents as manual appears in the README table, and that every command in it is copy-paste checked with `bash -n` or against a local Docker where possible.
- [ ] 4.2 Link the runbook from `docs/nurlings-deployment.md` with a one-line pointer. Verify: the link resolves in the rendered file and `pnpm brand:check` still passes.

## 5. Real-server check (needs a throw-away Coolify server; maintainer-assisted)

- [ ] 5.1 Deploy the file on a test Coolify server with only `NURLINGS_VERSION` and a domain set. Verify, and record in the PR description: generated secrets exist and differ, the app signs up and signs in over TLS, a bot computer starts and keeps its home across a redeploy, the supervisor reaches `web` on the isolated network, `docker login` 401 behaves as documented, and an upgrade to a second tag migrates cleanly.
- [ ] 5.2 Take a backup and restore it to a second empty stack using the README steps. Verify: messages and a bot's files are present after the restore.

## Workflow follow-up

- Open the PR "Add Coolify deployment for Nurlings" from `deploy/coolify-compose`; do not merge.
- Archive the change after merge and verify the archived result.
