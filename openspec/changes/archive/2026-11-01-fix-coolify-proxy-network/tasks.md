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

## 3. Coolify label escaping

- [x] 3.1 Confirm on the test server that the label resolves to the UUID only with "Escape special
  characters in labels" OFF. Verify: reported by the maintainer from the test server.
- [x] 3.2 Make the setting a required step in the runbook checklist and the Gateway Timeout entry
  with the `docker inspect` check, and note it in the compose comment. Verify: the runbook test
  passes.
- [x] 3.3 Keep the label guard and extend it to the setting. Verify: `coolify-compose.test.ts`
  passes.

## 4. After merge

- [ ] 4.1 Redeploy a client server twice and confirm the site answers after each. Verify: no
  Gateway Timeout.
- [x] 4.2 Archive the change with `--skip-specs` (a deployment fix has no spec delta).
