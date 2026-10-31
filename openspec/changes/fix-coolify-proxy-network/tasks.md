# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for this fix with a proposal and tasks only. Verify: explicit request in
  the session.

## 2. Fix

- [x] 2.1 Add the `traefik.docker.network` label to `web`, taking `NURLINGS_PROXY_NETWORK` first
  and `COOLIFY_RESOURCE_UUID` otherwise, failing the deploy when both are empty. Verify:
  `docker compose config` renders the label with either variable and errors with neither.
- [x] 2.2 Document the variable and the Gateway Timeout symptom in `deploy/coolify/README.md`.
  Verify: the runbook test passes.
- [x] 2.3 Guard the label in `coolify-compose.test.ts`. Verify: the test passes.

## 3. After merge

- [ ] 3.1 Redeploy a client server twice and confirm the site answers after each. Verify: no
  Gateway Timeout.
- [ ] 3.2 Archive the change with `--skip-specs` (a deployment fix has no spec delta).
