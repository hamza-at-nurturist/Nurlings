# Deploying Nurlings to a client server

Each client runs their own Nurlings server. This page covers what is specific to Nurlings: where
the images live, how a client server is allowed to pull them, and how to hand over and upgrade an
install. Everything else (secrets, TLS, backups, sandboxes) is in [self-host.md](self-host.md),
which describes the upstream project and still applies. Environment variable names are unchanged
and still start with `RAKAZO_`.

## What is published

`.github/workflows/publish-nurlings-images.yml` builds three amd64 images and pushes them to
`ghcr.io/nurturist-ai/nurlings/<image>`. Every segment of an image reference is lowercase.

| Image | Contents |
| --- | --- |
| `ghcr.io/nurturist-ai/nurlings/app` | api, worker, web and the sandbox supervisor |
| `ghcr.io/nurturist-ai/nurlings/computer` | the Linux desktop used as each bot computer |
| `ghcr.io/nurturist-ai/nurlings/updater` | the updater sidecar (not used, see below) |

| Tag | Published on |
| --- | --- |
| `edge` | pushes to `main` |
| `vX.Y.Z`, `vX.Y` | release tags (`v*`) |
| `latest` | stable release tags only |
| `sha-<full-commit>` | every push and every manual run |

The registry prefix lives in one place, `packages/brand/brand.json`. The compose files, `.env`
examples and the CI tests all read it or are checked against it. To publish by hand, run the
workflow from the Actions tab (`workflow_dispatch`).

## How a client server pulls private images

The images are private. A client server authenticates to `ghcr.io` with a read-only token that
belongs to a dedicated machine user, never to a person.

One-time setup, by a maintainer:

1. Create a GitHub user for pulling images (for example `nurlings-pull`) and add it to the
   `nurturist-ai` organization with read access to the `nurlings` repository.
2. In each of the three packages' settings, confirm the package inherits access from the
   repository or grant the machine user **Read** directly. The workflow links each image to the
   repository through its `org.opencontainers.image.source` label.
3. Signed in as the machine user, create a **classic** personal access token with only the
   `read:packages` scope. GitHub Container Registry does not accept fine-grained tokens. Set an
   expiry and record it.

On the client server, log in once:

```bash
echo "$NURLINGS_REGISTRY_TOKEN" | docker login ghcr.io --username nurlings-pull --password-stdin
```

or let the installer do it. It reads two shell variables (never `.env`) and passes the token to
`docker login` on standard input, before the pull:

```bash
NURLINGS_REGISTRY_USER=nurlings-pull NURLINGS_REGISTRY_TOKEN=... bash install-images.sh --local
```

The installer refuses a user without a token (and the reverse), never prints either value, and
prints this hint when a pull fails: set both variables, or run `docker login ghcr.io`.

## Deploying with Coolify

Client servers managed with Coolify use the compose file and runbook in
[deploy/coolify](../deploy/coolify/README.md) instead of the installer. It covers the registry login
above, the mandatory bot egress rules, DNS, upgrades and backups.

## Handing an install to a client (the install kit)

The repository is private, so the installer cannot fetch its own files anonymously. Deliver these
files to the client server directly and run the installer in its local-files mode:

- `infra/compose/install-images.sh`
- `infra/compose/docker-compose.images.yml`
- `infra/compose/.env.images.example`
- `infra/compose/restrict-computer-egress.sh` (the installer tries to download it to restrict bot
  computer egress; without it a private repository makes it fall back to open egress with a warning)

```bash
bash install-images.sh --local
```

`--local` uses the files already present and generates a `.env` with random secrets. Back up
`ENCRYPTION_KEY` from that `.env`; encrypted content cannot be recovered without it.

Fallback only: if the files must be downloaded, set `NURLINGS_DOWNLOAD_TOKEN` to a token that can
read the private repository (a classic token with the `repo` scope, which is much broader than
`read:packages`). The installer sends it as a bearer header to `raw.githubusercontent.com` through
curl's standard input, so it does not appear in the process list or in any output. Prefer the kit.

## Rotating and revoking access

- **Rotate:** create a new `read:packages` token as the machine user, run `docker login ghcr.io`
  again (or rerun the installer with the new `NURLINGS_REGISTRY_TOKEN`), then delete the old token.
  Do it before the recorded expiry; an expired token only breaks the next pull, not running
  containers.
- **Revoke one client:** tokens are per machine user, so give each client its own machine user and
  remove that user, or delete its token, to cut that client off. Running containers keep working;
  they just cannot pull new images.
- **If a token leaks:** delete it immediately and rotate every server that shared it.

## The desktop app's local stack

Choosing "This computer" in the desktop app runs the same `docker-compose.images.yml` with the
three images above, pulled by the machine's own Docker. For a private registry, run
`docker login ghcr.io` once on that machine before using it, with a token like the one above.
Without it the pull fails with an access-denied message from Docker.

## Upgrading a client server

The in-app updater is switched off (see below), so upgrades are explicit:

```bash
# in the directory holding docker-compose.images.yml and .env (both lines exist in the generated .env)
sed -i 's/^RAKAZO_IMAGE_TAG=.*/RAKAZO_IMAGE_TAG=v1.2.3/' .env
sed -i 's/^RAKAZO_COMPUTER_IMAGE_TAG=.*/RAKAZO_COMPUTER_IMAGE_TAG=v1.2.3/' .env
docker compose pull
docker compose up -d --wait
```

Pin a release tag or a `sha-<full-commit>` tag rather than `edge` or `latest` so a client only
moves when you decide. To roll back, set the previous tag and run the same two commands.

## Why the updater stays off

Nurlings sets `updates.serverSelfUpdate` to `false` in `brand.json`. The API then reports an
install that cannot update itself, rejects check and apply requests with "Self-update is switched
off for this deployment", and makes no request to an updater sidecar. The settings screen shows no
software-update section. Do not start the `updater` compose profile on a client server.

## Passkeys for the Nurlings mobile app

The mobile app's identifiers are `com.nurturistai.nurlings` on iOS and Android. A server serves its
association files only when told which builds to vouch for:

```bash
# iOS: <Apple team id>.com.nurturistai.nurlings
PASSKEY_APPLE_APP_IDS=ABCDE12345.com.nurturistai.nurlings
# Android: the SHA-256 fingerprint(s) of the Nurlings signing certificate
PASSKEY_ANDROID_CERT_SHA256=AA:BB:...:FF
```

The Android package name in `/.well-known/assetlinks.json` comes from the brand configuration, so
only the fingerprint is per deployment. Until a platform's value is set, that platform's app hides
passkeys on this server.
