## ADDED Requirements

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
