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

## 5. Real-server check (done by the maintainer on the test Coolify server)

- [x] 5.1 Deploy the file on the test Coolify server with only `NURLINGS_VERSION` and a domain set. Verified by the maintainer on `v0.1.0`: every long-running service reached healthy (the exited one-shots did not mark the resource unhealthy), the site answers over TLS, the first account was created and sign-up then locked with `SIGNUPS_ENABLED=false`, a bot computer started, browsed the public internet and wrote a file, and with restricted egress the Docker bridge address and the cloud metadata address time out while the public internet works. Found and fixed on this server: the port-suffixed URL variable carries the port (PR 3).

## Workflow follow-up

- Done: PR "Add Coolify deployment for Nurlings" opened as a draft and merged; `v0.1.0` cut from `main`; archived.
- Still to verify on a real server (not covered by the test deploy above): a bot computer keeps its home across a redeploy; an upgrade to a second tag migrates cleanly; a missing registry login fails with the documented 401; a backup restores into a second empty stack with messages and a bot's files intact (README section 8).
