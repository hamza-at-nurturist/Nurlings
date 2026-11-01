# Proposal

## Why

After a redeploy on Coolify the public site sometimes answers Gateway Timeout until the stack is
redeployed again. The `web` container sits on several networks: Coolify's resource network (named
after the resource UUID, the one `coolify-proxy` is on), the compose `app` network (the proxy is
not on it), and the isolated networks the supervisor attaches for bot computers. Without a
`traefik.docker.network` label, Traefik may pick an address on a network the proxy cannot reach.

## What Changes

`web` in `deploy/coolify/docker-compose.yml` gets a `traefik.docker.network` label that names
Coolify's resource network. The value comes from `COOLIFY_RESOURCE_UUID`, which Coolify provides
to every Docker Compose resource, so no server-specific UUID is committed. An optional
`NURLINGS_PROXY_NETWORK` variable overrides it. If neither has a value, the deploy stops with a
clear message instead of shipping an empty label. The runbook documents the variable and a
troubleshooting entry, and `coolify-compose.test.ts` guards the label.

Verified on the test server: the label resolves to the resource UUID only when Coolify's "Escape
special characters in labels" setting (resource, Advanced) is OFF. With it on, Coolify escapes the
`$` and the label stays a literal `${...}` string, so the pin silently does nothing. The runbook
therefore makes that setting a required setup step and adds it to the Gateway Timeout entry with
the `docker inspect` check that must print the UUID, and the compose file notes it beside the
label. The compose test guards that the runbook and the file both mention it.

Not changed: `infra/compose` (non-Coolify), networks, or any other service.

## Impact

- Capability: none. This is a deployment fix, so there is no spec delta.
- No application code.
