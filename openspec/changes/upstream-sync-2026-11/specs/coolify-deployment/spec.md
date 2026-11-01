## ADDED Requirements

### Requirement: Admin accounts can be named
The compose file SHALL pass `RAKAZO_ADMIN_EMAILS` through to the API and worker as an optional variable with an empty default
value, and the deployment guide SHALL say it lists the accounts allowed to add local (stdio) MCP
servers.

#### Scenario: Passthrough
- **WHEN** the rendered file is inspected
- **THEN** the api service lists `RAKAZO_ADMIN_EMAILS` with no value, and the compose-env test passes
