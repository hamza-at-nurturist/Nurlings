## MODIFIED Requirements

### Requirement: Startup is ordered by health and migrates automatically

Every long-running service SHALL define a healthcheck and dependent services SHALL wait with
`condition: service_healthy` (or `service_completed_successfully` for one-shot steps). Database
migrations SHALL run in a one-shot `migrate` service that is the only container holding the owner
database login; the api and worker SHALL wait for it and connect as the runtime login.

#### Scenario: Ordered start

- **WHEN** the stack starts from empty
- **THEN** Postgres is healthy before `migrate` runs, `migrate` completes before the api and worker start, the api and supervisor are healthy before the worker starts, and web starts after the api is healthy

#### Scenario: Upgrade migrates

- **WHEN** `NURLINGS_VERSION` is changed and the stack is redeployed
- **THEN** pending migrations are applied before the new api accepts requests

#### Scenario: No owner login in the app

- **WHEN** the rendered file is inspected
- **THEN** only `migrate` has `DATABASE_MIGRATION_URL`

## ADDED Requirements

### Requirement: Admin accounts can be named

The compose file SHALL pass `RAKAZO_ADMIN_EMAILS` through to the API as an optional variable with an
empty default, and the guide SHALL say it lists the accounts allowed to add local (stdio) MCP
servers. No email address SHALL be committed.

#### Scenario: Passthrough

- **WHEN** the rendered file is inspected
- **THEN** the api service lists `RAKAZO_ADMIN_EMAILS` with an empty default and the compose-env test passes

### Requirement: Billing stays off unless the operator configures it

The compose file SHALL NOT give the API a default for any Stripe setting, so a deployment shows no
paywall, plan, upgrade button or credit meter, and enforces no credit limit or computer allowance,
until the operator sets the Stripe variables.

#### Scenario: A client server with no Stripe settings

- **WHEN** the stack runs without Stripe variables
- **THEN** the app reports billing disabled and nothing in it is gated on credits
