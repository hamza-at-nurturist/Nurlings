## ADDED Requirements

### Requirement: The shared test suites run on GitHub's runners here

The lint, typecheck, unit and production-build suites SHALL run from `.github/workflows/test-suites.yml`
on GitHub's runners for both pull requests and pushes to `main`, and the Nurlings brand guard and
the built-app brand check SHALL run inside them. The Depot copy of the suites SHALL stay identical
to that file.

#### Scenario: Pull request

- **WHEN** a pull request is opened or updated
- **THEN** the suites run on GitHub's runners through `ci.yml`, including `pnpm brand:check`

#### Scenario: Depot copy drifts

- **WHEN** `.depot/workflows/test-suites.yml` differs from `.github/workflows/test-suites.yml`
- **THEN** the repository's kept-in-step check fails
