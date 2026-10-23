# coolify-deployment Specification

## Purpose
Defines the Coolify v4 deployment of a dedicated Nurlings client server: a single compose file that
Coolify can deploy as-is, and the runbook a teammate follows to set one up.

## Requirements

### Requirement: Images are pinned to one version variable
Every Nurlings image in the Coolify compose file SHALL come from the configured registry prefix and
SHALL take its tag from one required variable, `NURLINGS_VERSION`, applied to both the app and the
bot computer image. The file SHALL NOT default that variable or use the `latest` tag.

#### Scenario: Version is required
- **WHEN** the file is rendered with `NURLINGS_VERSION` unset or empty
- **THEN** rendering fails and names the variable

#### Scenario: One variable moves every image
- **WHEN** `NURLINGS_VERSION` is set to a published tag
- **THEN** the api, worker, web and supervisor services and the bot computer image all use that tag

#### Scenario: No floating or upstream references
- **WHEN** the rendered file is inspected
- **THEN** no image uses `latest` or names the upstream registry, and none of them, no domain, and no operator-facing default contains "rakazo"

### Requirement: Public routing goes through Coolify only
The file SHALL NOT publish host ports. Exactly one service, `web`, SHALL receive a public domain,
routed to its port 5173, and the app's public URL settings SHALL be derived from that domain.

#### Scenario: No host ports
- **WHEN** the rendered file is inspected
- **THEN** no service has a `ports` entry

#### Scenario: Public URLs follow the domain
- **WHEN** the operator sets the `web` domain in Coolify
- **THEN** the sign-in URL, web origin, API URL and the web host allowlist all use that domain

#### Scenario: Internal services stay private
- **WHEN** the stack is deployed
- **THEN** the database, supervisor, api and worker have no public domain

### Requirement: Secrets are generated, operator keys are optional
The file SHALL have Coolify generate the database passwords, the sign-in secret, the encryption
key, the screen-proxy secret and the sandbox-supervisor token, as distinct values that satisfy the
app's secret rules. Model, email and integration keys SHALL be optional pass-throughs that leave the
stack bootable when empty.

#### Scenario: Zero required manual values besides version and domain
- **WHEN** an operator sets only `NURLINGS_VERSION` and the `web` domain
- **THEN** the stack starts and sign-up works

#### Scenario: Secrets satisfy the app's rules
- **WHEN** the generated values are read by the api
- **THEN** the supervisor token, screen-proxy secret and sign-in secret are each at least 32 characters and differ from one another

### Requirement: The Docker socket is scoped to the supervisor
Only the sandbox supervisor SHALL mount `/var/run/docker.sock`. No other service SHALL mount it or
publish the supervisor's port.

#### Scenario: Socket scope
- **WHEN** the rendered file is inspected
- **THEN** exactly one service mounts the Docker socket and it is `supervisor`

### Requirement: Bot computers are cut off from the host and private network
The supervisor SHALL default to restricted egress so bot computers reach only the public internet
and cannot reach the Docker host, the Coolify dashboard, other apps or the private network. The
runbook SHALL install the host rules as a mandatory setup step before the first deploy.

#### Scenario: Restricted by default
- **WHEN** the file is rendered with no egress setting
- **THEN** the supervisor runs with restricted egress and public DNS servers for computers

#### Scenario: Rules missing
- **WHEN** the host rules are not installed and a computer is requested
- **THEN** the supervisor refuses to start it and names the script that installs them

#### Scenario: Setup installs the rules
- **WHEN** an operator follows the runbook's setup steps in order
- **THEN** the egress rules are installed and verified before the stack is deployed

### Requirement: No service can reach the host by name
The file SHALL NOT map `host.docker.internal` or any other host alias into a service.

#### Scenario: No host alias
- **WHEN** the rendered file is inspected
- **THEN** no service has `extra_hosts`

### Requirement: Data that must survive redeploys is in named volumes
Postgres data and the app data directory (bot workspaces and home directories) SHALL be named
volumes. A redeploy or version change SHALL NOT remove them.

#### Scenario: Persistent paths
- **WHEN** the rendered file is inspected
- **THEN** the Postgres data directory and the app data directory are mounted from named volumes

#### Scenario: Bot computers keep their home
- **WHEN** a bot computer is recreated after a redeploy
- **THEN** its home directory is the same as before

### Requirement: Startup is ordered by health and migrates automatically
Every service SHALL define a healthcheck and dependent services SHALL wait with
`condition: service_healthy` (or `service_completed_successfully` for one-shot steps). Database
migrations SHALL run automatically before the api serves, as in the existing compose file.

#### Scenario: Ordered start
- **WHEN** the stack starts from empty
- **THEN** Postgres is healthy before the api migrates, the api and supervisor are healthy before the worker starts, and web starts after the api is healthy

#### Scenario: Upgrade migrates
- **WHEN** `NURLINGS_VERSION` is changed and the stack is redeployed
- **THEN** pending migrations are applied before the new api accepts requests

### Requirement: Self-update stays off
The file SHALL NOT include the updater service or any variable that enables server self-update.

#### Scenario: No updater
- **WHEN** the rendered file is inspected
- **THEN** it has no updater service or `updater` image, and sets no updater URL or token

### Requirement: A runbook covers a new client end to end
`deploy/coolify/README.md` SHALL describe server requirements (including memory per running bot),
the one-time private-registry login with a machine-user read-only token, DNS records, the Coolify
steps, the variables to fill with optional ones marked, upgrade and rollback, Postgres and
volume backup and restore, and common failures (port clashes, Docker-socket permission errors,
image pull 401).

#### Scenario: Runbook completeness
- **WHEN** the README is checked against this list
- **THEN** each topic has its own section and every variable in the compose file that needs a manual value appears in its table

#### Scenario: Restore is documented with the key
- **WHEN** an operator follows the backup section
- **THEN** it includes backing up the encryption key, because backups are unreadable without it

### Requirement: The file cannot drift from the app
A deterministic, offline test SHALL fail when the Coolify file passes an environment variable the
code does not read, omits one the app requires, publishes a port, uses `latest` or a literal
secret, or names the upstream.

#### Scenario: Drift detected
- **WHEN** a required app variable is removed from the Coolify file
- **THEN** the test fails and names the variable

### Requirement: A server can choose to pull moved images
Every first-party image service in the Coolify compose file SHALL take its pull policy from the
optional variable `NURLINGS_PULL_POLICY`, defaulting to `missing`. The file SHALL NOT hardcode
`always`, so a client server on a release tag does not depend on the registry at every redeploy,
and the test server that follows `edge` can set `always` to fetch a moved tag.

#### Scenario: Default
- **WHEN** the file is rendered with `NURLINGS_PULL_POLICY` unset
- **THEN** the api, worker, web, supervisor and bot computer image services all use the pull policy `missing`

#### Scenario: Test server
- **WHEN** `NURLINGS_PULL_POLICY` is set to `always` and the stack is redeployed
- **THEN** every first-party image is pulled again, so a moved `edge` tag is fetched

#### Scenario: No hardcoded override
- **WHEN** the file is inspected
- **THEN** no service sets `pull_policy` to `always` directly
