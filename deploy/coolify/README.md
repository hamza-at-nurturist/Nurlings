# Nurlings on Coolify (one dedicated server per client)

`docker-compose.yml` here runs the whole Nurlings stack on a Coolify v4 server: Postgres, the
API, the worker, the web app and the supervisor that starts each bot's computer. Coolify's proxy
gives it HTTPS on one domain. Coolify generates every secret. You set a version and a domain.

Background on the images and the registry token: [docs/nurlings-deployment.md](../../docs/nurlings-deployment.md).

## 1. Server requirements

- Linux amd64 (the images are amd64 only) with Coolify v4 installed and Docker Engine 26 or newer.
  Check: `docker version --format '{{.Server.Version}}'`. Rootless Docker and Docker Desktop are not supported.
- Ports 80 and 443 reachable from the internet. Nothing in this file publishes a host port.
- Sizing, from the memory limits in the compose file (measure on the first client and adjust):

  | | vCPU | RAM | Disk |
  | --- | --- | --- | --- |
  | Stack without bots | 2 | 8 GB (its memory limits add up to about 6.5 GB) | 40 GB |
  | Each running bot computer | up to 2 | up to 2 GB | a few GB for its home |

  A server for up to 3 bots running at once: 8 vCPU, 16 GB RAM, 160 GB disk. Per-bot limits are
  `RAKAZO_COMPUTER_MEMORY` (default `2g`) and `RAKAZO_COMPUTER_CPUS` (default `2`). A bot that is not
  running costs only disk.
- If the server hosts other things, that is fine: bots are cut off from them by step 3.

## 2. One-time setup: registry login

The images are private. As **root** on the server, log in with a read-only token that belongs to a
machine user (for example `nurlings-pull`), never a person:

```bash
echo "$TOKEN" | docker login ghcr.io --username nurlings-pull --password-stdin
```

The token is a classic token with only `read:packages`. How to create the machine user and give
it read access to the `app` and `computer` packages is in
[docs/nurlings-deployment.md](../../docs/nurlings-deployment.md#how-a-client-server-pulls-private-images).
Verify: `docker pull ghcr.io/hamza-at-nurturist/nurlings/app:<version>` succeeds as root.

Do not run `docker system prune -a` on this server: it removes the bot computer image, which the
supervisor needs on the host. A redeploy pulls it again.

## 3. One-time setup: restrict bot egress

Mandatory. Without it, a bot's computer could reach the Coolify dashboard, the host and the private
network. This installs firewall rules so computers reach the public internet only, and keeps them
across reboots. From a checkout of this repository:

```bash
scp infra/compose/restrict-computer-egress.sh root@SERVER:/root/
ssh root@SERVER 'bash /root/restrict-computer-egress.sh'
ssh root@SERVER 'iptables -S DOCKER-USER | grep -c "rakazo-c"'    # prints a number above 0
```

The compose file sets `SANDBOX_COMPUTER_EGRESS=restricted`, so until these rules exist the
supervisor refuses to start a computer and says so. Rules apply to computers only, not to Coolify
or other apps on the server. If the host's DNS resolver is private, the default
`SANDBOX_COMPUTER_DNS=1.1.1.1,1.0.0.1` already covers it.

## 4. DNS

Create one record before deploying so Coolify can issue the certificate:

| Type | Name | Value |
| --- | --- | --- |
| A | `<client>.nurlings.nurturistai.com` | the server's public IPv4 address |

Add an AAAA record only if the server has public IPv6. If Cloudflare proxies the record, set its
SSL mode to Full (strict).

## 5. Deploy in Coolify

1. Project → Environment → **Add Resource** → **Docker Compose Empty**.
2. Paste the contents of `docker-compose.yml`. Save.
3. Open the `web` service and set its domain to `https://<client>.nurlings.nurturistai.com`.
   It is the only service with a domain. If Coolify asks for the port, it is `5173`.
4. Open **Environment Variables**:
   - Set `NURLINGS_VERSION` to the release tag to deploy (see section 7). Never `latest` or `edge`.
   - Check that the `SERVICE_PASSWORD_*` values and `SERVICE_URL_WEB` / `SERVICE_FQDN_WEB` exist,
     and that the URL shows your domain with no port.
   - Fill any optional values from the table below.
   - Copy `SERVICE_PASSWORD_64_CRYPT` (the encryption key) to the client's password manager now.
5. **Deploy**. The first start takes a few minutes: it pulls three images and runs migrations.
   All services should reach healthy; `computer` and `data-init` run once and exit.
6. Open the URL and register the first account straight away: the first registered user becomes the
   deployment owner. Then set `SIGNUPS_ENABLED` to `false` (it is `true` until you do) or limit
   registration with `SIGNUP_ALLOWLIST`, and redeploy.

## 6. Variables

Only `NURLINGS_VERSION` is mandatory. Everything else works empty.

| Variable | Required | Secret | What it is |
| --- | --- | --- | --- |
| `NURLINGS_VERSION` | yes, you set it | no | Release tag for every image, for example `v0.1.0`. |
| `NURLINGS_PULL_POLICY` | optional | no | `missing` (default) pulls an image only when the server lacks it. Only the test server sets `always`, so a redeploy also pulls a moved `edge` tag. |
| `SERVICE_PASSWORD_POSTGRES` | generated | yes | Database owner password. |
| `SERVICE_PASSWORD_APPDB` | generated | yes | The app's database login password. |
| `SERVICE_PASSWORD_64_AUTH` | generated | yes | Session signing secret. |
| `SERVICE_PASSWORD_64_CRYPT` | generated | yes | Encryption key (`ENCRYPTION_KEY`). **Back it up**: data and backups cannot be read without it. |
| `SERVICE_PASSWORD_64_SCREEN` | generated | yes | Secret shared by web and API for bot screens. |
| `SERVICE_PASSWORD_64_SUPERVISOR` | generated | yes | Credential for the supervisor. |
| `SERVICE_FQDN_WEB` | generated | no | Public hostname, from the `web` domain. |
| `SERVICE_URL_WEB` | generated | no | Public URL, from the `web` domain. |
| `OPENROUTER_API_KEY` | optional | yes | Models through OpenRouter. |
| `ANTHROPIC_API_KEY` | optional | yes | Anthropic models directly. |
| `OPENAI_API_KEY` | optional | yes | OpenAI models directly. |
| `COMPOSIO_API_KEY` | optional | yes | Third-party app integrations. |
| `SMTP_URL` | optional | yes | Outgoing mail for password recovery, for example `smtps://user:pass@smtp.example.com:465`. |
| `EMAIL_FROM` | optional | no | Sender address for that mail. |
| `SIGNUPS_ENABLED` | optional | no | `true` by default. **Set it to `false` and redeploy right after the first account is created.** |
| `SIGNUP_ALLOWLIST` | optional | no | Comma-separated addresses allowed to register. |
| `MAX_UPLOAD_SIZE_MB` | optional | no | Per-file upload limit, default `10`. |
| `CONTENT_ENCRYPTION` | optional | no | `on` (default) or `off`. |
| `TICKET_BOARD_ENABLED` | optional | no | `false` by default. Set it to `true` to turn on the ticket board. |
| `RAKAZO_COMPUTER_MEMORY` | optional | no | RAM limit per bot computer, default `2g`. |
| `RAKAZO_COMPUTER_CPUS` | optional | no | CPU limit per bot computer, default `2`. |
| `SANDBOX_COMPUTER_DNS` | optional | no | DNS servers for bot computers, default `1.1.1.1,1.0.0.1`. |
| `SANDBOX_COMPUTER_EGRESS` | optional | no | Leave as `restricted` (default). |
| `SENTRY_DSN` | optional | yes | Error reporting. |
| `LOG_LEVEL` | optional | no | `info` (default). |

`POSTGRES_USER` and `POSTGRES_DB` default to `nurlings`; do not change them after the first deploy.
Other advanced settings (single sign-on, Stripe, messaging channels) are in the compose file;
add an entry to the file, not just a Coolify variable, when a setting is not listed there.

### Telegram

1. Create a bot with @BotFather and copy the token.
2. In Coolify, set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET_TOKEN` (letters and digits, 20 or more characters), then redeploy.
3. Register the webhook once by opening this address in a browser, with your token, domain and secret filled in:

   ```
   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/v1/messaging/webhook/telegram&secret_token=<SECRET>
   ```

## 7. Update a client

Updates are explicit: the in-app updater is off.

1. Take a backup (section 8).
2. Change `NURLINGS_VERSION` to the new release tag (for example `v0.2.0`) and **Redeploy**.
   Migrations run before the new API serves. Running bots restart on the new image.
3. Check that every service is healthy and sign in.

Roll back by setting the previous tag and redeploying. Migrations only go forward, so if the new
version already migrated the database, restore the backup from step 1 first (section 8).

Release tags are cut from `main`. Until the first release exists, deploy a `sha-<40-character commit>`
tag that the publish workflow built (Actions → publish-nurlings-images → Run workflow).

## 8. Back up and restore

Back up the database, the `appdata` volume (bot workspaces and home directories) and the encryption
key. Backups are unreadable without `SERVICE_PASSWORD_64_CRYPT`, so keep it somewhere else.

Find the resource's UUID in the Coolify URL, then on the server as root:

```bash
UUID=<resource uuid>
PG=$(docker ps -q --filter label=com.docker.compose.project=$UUID --filter label=com.docker.compose.service=postgres)
VOL=$(docker volume ls -q --filter label=com.docker.compose.project=$UUID --filter label=com.docker.compose.volume=appdata)

docker exec "$PG" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > nurlings-$(date +%F).dump
docker run --rm -v "$VOL":/data:ro -v "$PWD":/backup busybox tar czf /backup/appdata-$(date +%F).tgz -C /data .
```

Restore into a freshly deployed, empty resource that uses the **same** `SERVICE_PASSWORD_64_CRYPT`
(edit it under Environment Variables before the first deploy, then deploy and wait for healthy):

```bash
UUID=<new resource uuid>
PG=$(docker ps -q --filter label=com.docker.compose.project=$UUID --filter label=com.docker.compose.service=postgres)
VOL=$(docker volume ls -q --filter label=com.docker.compose.project=$UUID --filter label=com.docker.compose.volume=appdata)

# stop everything that writes
for s in api worker supervisor; do
  docker stop $(docker ps -q --filter label=com.docker.compose.project=$UUID --filter label=com.docker.compose.service=$s)
done

docker exec -i "$PG" sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < nurlings-YYYY-MM-DD.dump
docker run --rm -v "$VOL":/data -v "$PWD":/backup busybox \
  sh -c 'cd /data && tar xzf /backup/appdata-YYYY-MM-DD.tgz && chown -R 1000:1000 /data'
```

Then **Redeploy** in Coolify to start everything again. Copy backups off the server.

## 9. Common problems

| Symptom | Cause and fix |
| --- | --- |
| `required variable NURLINGS_VERSION is missing a value` | Set `NURLINGS_VERSION` under Environment Variables. |
| Image pull fails with `401`, `unauthorized` or `denied` | `docker login ghcr.io` was not run as root on this server, the token expired, it lacks `read:packages`, or the machine user has no Read access to the `app` or `computer` package. Test with `docker pull ghcr.io/hamza-at-nurturist/nurlings/app:<version>` as root. |
| `port is already allocated` or `address already in use` | This file publishes no host ports, so someone added a `ports:` entry. Remove it: Coolify's proxy owns 80 and 443. If the proxy itself will not start, another program on the server is using those ports. |
| `permission denied while trying to connect to the Docker daemon socket` in the supervisor | `/var/run/docker.sock` is missing on the host or Docker is rootless, or a security module blocks it. Check `ls -l /var/run/docker.sock` and `docker info`. The supervisor runs as root and is the only service with the socket. |
| A bot will not start; the error mentions `restrict-computer-egress.sh` | Step 3 was not done on this server. Run it, then try the bot again. |
| Bots start but cannot look anything up | DNS: set `SANDBOX_COMPUTER_DNS` to a public resolver your network allows. |
| `Blocked request. This host is not allowed` on the web page | The `web` domain does not match the URL you are using. Fix the domain and redeploy. |
| `worker` shows unhealthy right after a deploy | It reports healthy after about two minutes; look at its logs if it does not. |
| Sign-in loops or redirects to `localhost` | `SERVICE_URL_WEB` is empty. Set the `web` domain and redeploy. |

## 10. The test server

`nurlings-test` is the one server that runs `edge`: every merge to `main` publishes new images and
asks Coolify to redeploy it. Client servers always run a release tag (section 7), never `edge`.

One-time setup:

1. On `nurlings-test`, set `NURLINGS_VERSION` to `edge` and `NURLINGS_PULL_POLICY` to `always`
   (never on a client server), then redeploy once. Without `always`, a redeploy keeps the `edge`
   image the server already has, so it can stay on an older commit.
2. In Coolify, open the resource's **Webhooks** page and copy the **Deploy Webhook** address. It
   ends in `/api/v1/deploy?uuid=<resource-uuid>&force=false`.
3. Create an API token under **Keys & Tokens → API tokens** with deploy permission. If the API is
   off, turn it on under **Settings → Advanced**.
4. In the GitHub repository, add two Actions secrets: `COOLIFY_TEST_DEPLOY_WEBHOOK` (the address)
   and `COOLIFY_TEST_DEPLOY_TOKEN` (the token). Without both, the workflow skips the redeploy and
   says so.

Check it after a merge: the public `/health` only answers `{"ok":true}`, so read the commit from
inside the `api` container (on the server as root, or in Coolify's terminal for the `api` service;
make sure the name filter matches one container):

```bash
docker exec "$(docker ps -qf name=api)" node -e "fetch('http://127.0.0.1:3100/internal/health').then(r=>r.json()).then(j=>console.log(j.revision))"
```

It should print the merge commit. If it prints the previous commit, the server did not pull the
moved `edge` image: check that `NURLINGS_PULL_POLICY` is `always`, or pull the `edge` images on the
server by hand and redeploy.
