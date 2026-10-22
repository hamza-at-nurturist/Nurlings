# Tasks

> Scope: `deploy/coolify/` (compose file and README) plus one guard test, and the worker health
> probe if open question 1 is answered "(a)". No change to `infra/compose`. Internal identifiers
> stay. Nothing is written under `deploy/coolify/` until the proposal is approved. One small commit
> per task or tight group; "Verify" is what proves it. Environment note: this sandbox has no Docker
> daemon, so only `docker compose config` can run here; running the stack is task 5.

## 1. Facts to settle before writing the file

- [x] 1.1 Resolve open questions 1-4 in `design.md` with the maintainer (done: worker probe port, `v0.1.0`, restricted egress as a mandatory setup step, `nurlings` database defaults) and update `design.md`, the spec and these tasks to match. Verify: `openspec validate add-coolify-deployment --strict` passes and `design.md` has no unanswered question that changes the file.
- [x] 1.2 Confirm the accepted `ENCRYPTION_KEY` format: `resolveEncryptionKey` takes any non-placeholder string and `content-keys.ts` derives the master key from it with HKDF, so a 64-character alphanumeric value is valid. Verify: read of `packages/core/src/secrets-guard.ts` and `packages/db/src/content-keys.ts` (no code change needed).

## 2. Worker health probe

- [x] 2.1 Port the worker slice of upstream `cc90c276` (not the whole 68-file commit): `health.ts`, `health-check.ts`, its test, the `index.ts` hook, the build entry, `lastCompletedAt` in the job reconciler, `logSinkHealth`, and the healthcheck in the four stock compose files. Verify: the worker, logging, adapters and updater tests and `check` pass, `pnpm --filter @rakazo/worker build` emits `dist/health-check.js`, and it exits 1 without a heartbeat file.

## 3. Compose file

- [x] 3.1 Create `deploy/coolify/docker-compose.yml` from `docker-compose.images.yml`: remove `ports`, `name:`, `extra_hosts` and the updater pieces; default egress to `restricted` with public DNS; add `NURLINGS_VERSION` pinning, `SERVICE_FQDN_WEB_5173`, URL variables, generated secrets (`SERVICE_PASSWORD_*`), named volumes, healthchecks on every long-running service (worker per 2.1 or the fallback probe), docker.sock on `supervisor` only. Verify: `docker compose -f deploy/coolify/docker-compose.yml config` succeeds with a sample env that sets `NURLINGS_VERSION` and the Coolify-generated names, and fails with a message naming `NURLINGS_VERSION` when it is unset.
- [x] 3.2 Add the guard test (design decision 9) in `infra/updater/src/coolify-compose.test.ts`, and add the file to the stacks in `compose-env.test.ts`. Verify: it passes now, and was shown to fail when each of these was temporarily introduced and reverted: a `ports` entry, a `latest` tag, a literal secret, a second docker.sock mount, an unread env key, a missing env key, the upstream registry, an `updater` service, and a removed healthcheck.
- [x] 3.3 Run the existing checks. Verify: `pnpm brand:check` and `pnpm --filter ./infra/updater test` pass; `git grep -niE "rakazo" -- deploy/coolify` lists only the internal env keys and the `rakazo_app` role comment, and no image, domain or value.

## 4. Runbook

- [x] 4.1 Write `deploy/coolify/README.md` with the sections from the spec, including the mandatory egress step (setup step 3) (requirements with RAM per bot and a Docker Engine 26+ check, machine-user `docker login`, DNS, Coolify steps, env table with optional marked, upgrade/rollback, backup/restore including `ENCRYPTION_KEY`, common problems). Verify: the guard test checks the sections and that every variable in the README table exists in the compose file; the README's shell blocks pass `bash -n` apart from their `<placeholder>` lines.
- [x] 4.2 Link the runbook from `docs/nurlings-deployment.md` with a one-line pointer. Verify: the link resolves in the rendered file and `pnpm brand:check` still passes.

## 5. Real-server check (done by the maintainer on test.nurlings.nurturistai.com from the draft PR)

- [ ] 5.1 Deploy the file on the test Coolify server with only `NURLINGS_VERSION` and a domain set (a `sha-<commit>` tag from a manual publish run on this branch, until `v0.1.0` exists). Verify and report back on the PR: generated secrets exist and differ, the app signs up and signs in over TLS, a bot computer starts and keeps its home across a redeploy, the supervisor reaches `web` on the isolated network, `docker login` 401 behaves as documented, and an upgrade to a second tag migrates cleanly.
- [ ] 5.2 Take a backup and restore it to a second empty stack using the README steps. Verify: messages and a bot's files are present after the restore.

## Workflow follow-up

- Open the PR "Add Coolify deployment for Nurlings" from `deploy/coolify-compose` as a draft; do not merge.
- After the maintainer's test deploy and the merge, cut `v0.1.0` from `main` so the publish workflow builds the release images clients are pinned to.
- Archive the change after merge and verify the archived result.
