# Design

## Context

See proposal.md for motivation. Current install path: `infra/compose/docker-compose.images.yml`
(Postgres 16, `computer` pull stub, `data-init`, `supervisor`, `api`, `worker`, `web`) plus
`install-images.sh`. Facts this design relies on, read from the tree:

- One app image (`.../nurlings/app`) runs api (3100), worker, web (`vite preview`, 5173, proxies
  `/rpc` and screen traffic to `api` via `API_PROXY_TARGET`) and the supervisor (7091). The
  `computer` image is the bot desktop; `updater` is unused.
- Only `supervisor` mounts `/var/run/docker.sock`. It finds its own `/data` mount, creates
  per-bot home directories as volume subpaths (Docker Engine 26+), and attaches the `web` container
  to isolated per-computer networks by looking up the Compose project label and
  `com.docker.compose.service=web`. So the service must stay named `web`, in one project, with no
  custom `container_name`.
- Persistent: `pgdata` (Postgres) and `appdata` (`/data`: bot workspaces, uploads, homes).
- Secret rules (`packages/core/src/secrets-guard.ts`): `BETTER_AUTH_SECRET` and `ENCRYPTION_KEY`
  required, placeholders rejected; `SANDBOX_SUPERVISOR_TOKEN` and `SCREEN_PROXY_SECRET` at least 32
  characters, distinct from each other and from `BETTER_AUTH_SECRET`.
- Tags published by `publish-nurlings-images.yml`: `edge` (main), `sha-<40-char commit>` (every
  push), `vX.Y.Z` / `vX.Y` and `latest` (release tags `v*`; `latest` only for stable). amd64 only.
  Packages are private. No `v*` tag exists yet.
- Coolify magic variables (from the Coolify docs page for Docker Compose; not verified against a
  running instance): `SERVICE_FQDN_<ID>[_<port>]` / `SERVICE_URL_<ID>[_<port>]` bind a domain and
  route to the numeric port; `SERVICE_PASSWORD_<ID>` (32) and `SERVICE_PASSWORD_64_<ID>` (64)
  generate alphanumeric values, shared by identical names within one resource; `${VAR:?}` blocks
  deploy while empty; `${VAR:-x}` gives a default. The docs say nothing about `/var/run/docker.sock`,
  `depends_on`, `container_name`, or volume name prefixing.

## Goals / Non-Goals

**Goals:** a single file Coolify deploys without edits; the fewest manual values; behaviour
identical to the existing images compose (hardening, ordering, migrations).

**Non-Goals:** Caddy/TLS (Coolify's Traefik does it); the updater; multi-server or HA; changing the
existing `infra/compose` install path; renaming internal `RAKAZO_*` keys; restricted-egress
automation (documented only).

## Decisions

1. **Derive from `docker-compose.images.yml`, not rewrite.** Keep the `x-app-environment` anchor and
   the hardening (`no-new-privileges`, `cap_drop: ALL`, `init`, pids/memory limits, internal `data`
   network). Alternative, a minimal env list, would silently drop settings the code reads; the guard
   test (decision 9) enforces parity instead.
2. **Do not set a top-level `name:`.** Coolify assigns the project; the supervisor reads the label
   from its own container, so any name works. Same reason for no `container_name`.
3. **Routing.** `web` declares `SERVICE_FQDN_WEB_5173`. `BETTER_AUTH_URL`, `WEB_ORIGIN`, `API_URL`
   use `${SERVICE_URL_WEB}`; `RAKAZO_HOST` uses `${SERVICE_FQDN_WEB}` (the vite host allowlist needs
   the bare hostname). The api is not exposed: browsers and the mobile app go through `web`'s proxy,
   exactly as in the single-origin published-images setup. `ports:` are removed everywhere.
4. **Secrets.** Distinct generated names so values differ: `POSTGRES_PASSWORD` ←
   `SERVICE_PASSWORD_POSTGRES`, `POSTGRES_APP_PASSWORD` ← `SERVICE_PASSWORD_APPDB`,
   `BETTER_AUTH_SECRET` ← `SERVICE_PASSWORD_64_AUTH`, `ENCRYPTION_KEY` ← `SERVICE_PASSWORD_64_CRYPT`,
   `SCREEN_PROXY_SECRET` ← `SERVICE_PASSWORD_64_SCREEN`, `SANDBOX_SUPERVISOR_TOKEN` ←
   `SERVICE_PASSWORD_64_SUPERVISOR`. The ID segment has no underscores (Coolify rule). The compose
   `:?` guards stay so an empty value blocks deploy rather than starting insecurely. Alternative of
   asking the operator to paste secrets was rejected: it is the main source of setup errors.
   Alphanumeric 64-character values satisfy the 32-character rule; the `ENCRYPTION_KEY` format
   accepted by the code is checked in task 1.2 before this is final.
5. **Version pin.** `NURLINGS_VERSION: ${NURLINGS_VERSION:?...}` with no default, used for both
   images; the registry prefix is a literal `ghcr.io/nurturist-ai/nurlings`, checked against
   `brand.json` by the guard. Because only `edge` and `sha-*` exist now, the first client deploy
   needs either a pushed release tag (recommended: cut `v0.1.0`) or a `sha-<commit>` value; the
   README says which to use. The compose file cannot forbid someone typing `edge`; the README says
   not to, and the guard checks the file only.
6. **Internal names kept, user-visible values branded.** `RAKAZO_*` keys the images read stay (they
   appear only in Coolify's variable list). Fresh servers have no history, so `POSTGRES_USER` and
   `POSTGRES_DB` default to `nurlings` here; the app role `rakazo_app` is created by migrations and
   stays. The guard's "no rakazo" check covers image references, domains, and values, not env keys
   or that role.
7. **Healthchecks.** postgres (`pg_isready`), supervisor (`/health` on 7091), api (`/health` on
   3100), web (fetch `/` on 5173, `start_period: 2m`, as in the prod compose) copy existing probes.
   `computer` and `data-init` are one-shot (`service_completed_successfully`, marked
   `exclude_from_hc: true` for Coolify). The **worker has no health endpoint in this tree** (see open
   question 1).
8. **Docker socket.** Mounted on `supervisor` only, with `user: root` as today. Coolify's docs do
   not say whether absolute host-path mounts are accepted for a pasted compose resource; this is
   verified on a real server in task 5.1 before the PR is marked ready.
9. **Guard test** next to `infra/updater/src/compose-env.test.ts` (same vitest project, same YAML
   parsing): every key the code reads that the images compose passes must also be passed here; no
   `ports`; exactly one `docker.sock` mount on `supervisor`; no `latest`/`edge` default or
   literal secret; registry prefix equals `brand.json`; no updater service; every service has a
   healthcheck or `exclude_from_hc`. The check for "rakazo" in image/domain/value positions lives
   here too. `brand:check` is run separately and must still pass.
10. **Bot images from our registry.** The supervisor's `RAKAZO_COMPUTER_IMAGE` is
    `ghcr.io/nurturist-ai/nurlings/computer:${NURLINGS_VERSION}`. The `computer` stub service stays
    so Compose pulls it with the stack; the host's `docker login` is what lets the supervisor create
    containers from it later.
11. **Backup/restore.** `pg_dump -Fc` through `docker exec` into a dump file, plus a tar of the
    `appdata` volume via a throw-away `busybox` container, plus an offline copy of `ENCRYPTION_KEY`
    (read from Coolify's variables). Volume names carry a Coolify prefix, so the README finds them
    with `docker volume ls` instead of assuming a name. Restore is the reverse into an empty stack
    with the same key. The repo's `backup-prod.sh` assumes a host layout and is not reused.
12. **Egress.** `SANDBOX_COMPUTER_EGRESS` is a pass-through, default auto, which means open without
    the host iptables script. The README states that bot computers can reach the host's private
    network by default and links `restrict-computer-egress.sh` as an optional hardening step.

## Risks / Trade-offs

- **Magic-variable behaviour unverified** (docs only) → task 5.1 runs the file on a throw-away
  Coolify server and records the result in the PR; the `:?` guards turn a failed generation into a
  blocked deploy, not an insecure one.
- **Docker socket on a managed platform** is root-equivalent → scoped to one service, documented,
  one dedicated server per client, no other tenant.
- **Volume subpaths need Docker Engine 26+** → README lists it as a requirement with a check command.
- **`edge` or a stale tag typed by an operator** → README, plus `NURLINGS_VERSION` documented as the
  only upgrade control.
- **Coolify may rename volumes or networks**, which the supervisor tolerates because it inspects its
  own mounts and project label; `container_name` is never set.
- **Open egress by default** → documented, not silently changed.

## Migration Plan

New deployment target; nothing existing moves. Rollout: deploy to a throw-away server (5.1), then
the first client. Rollback is changing `NURLINGS_VERSION` back and redeploying; migrations are
forward-only, so the README tells operators to back up before an upgrade. Removing the setup means
deleting the Coolify resource; data volumes stay until deleted explicitly.

## Open Questions

1. **Worker healthcheck.** The worker has no health endpoint here; upstream added
   `apps/worker/src/health-check.ts` (commit `cc90c276`) and its prod compose probes it with
   `node dist/health-check.js`. Options: (a) cherry-pick that upstream commit (small, keeps us
   aligned, touches `apps/worker`); (b) ship a probe in the compose file that only proves the
   process is alive and can open a TCP connection to Postgres (no code change, weaker). Recommend
   (a). This changes the task list, so it needs your decision before implementation.
2. **First version tag.** Cut `v0.1.0` (recommended) or pin a `sha-<commit>` for the first client?
3. **Egress default** for client servers: keep open-by-default with the documented optional script
   (this design), or require restricted egress in the README as a mandatory step?
4. **Postgres user/db defaults** as `nurlings` (this design) versus the existing `rakazo` defaults
   so a client server can later be moved to the stock install without renaming.
