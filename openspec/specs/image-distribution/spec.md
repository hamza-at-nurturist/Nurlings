# image-distribution Specification

## Purpose
Defines how the Nurlings images are built from this repository, published to a private registry, referenced by the compose files and installer, and pulled by client servers with a read-only credential.

## Requirements

### Requirement: Images are built from this repository into a private registry
A GitHub Actions workflow SHALL build the `app`, `updater` and `computer` images from this
repository and push them to the GitHub Container Registry under the repository owner's lowercased
namespace, as `ghcr.io/<owner>/nurlings/<image>`, with packages private. Pushes to `main` SHALL
publish an `edge` tag, version tags SHALL publish version tags, and every image SHALL carry its
source commit tag.

#### Scenario: Publish on main
- **WHEN** a commit is pushed to `main`
- **THEN** all three images are built and pushed with the `edge` and commit tags to `ghcr.io/<owner>/nurlings/<image>`

#### Scenario: Mixed-case repository name
- **WHEN** the repository or owner name contains uppercase letters
- **THEN** every image reference used by the workflow, compose files and installer is entirely lowercase and valid

#### Scenario: Install kit without repository access
- **WHEN** an operator runs the installer from the delivered install kit
- **THEN** it starts the stack from local files and a read-only registry credential, with no access to the private repository

#### Scenario: Upstream workflow does not run
- **WHEN** a commit is pushed in this repository
- **THEN** the upstream publish workflow's build and publish jobs are skipped

### Requirement: Compose files and installer default to our images
Every compose file and the env example SHALL default to the configured registry prefix instead of
the upstream registry, and the installer SHALL be able to authenticate to the private registry and
to download its files from a private repository.

#### Scenario: Image defaults
- **WHEN** `docker-compose.images.yml`, `docker-compose.prod.yml`, `docker-compose.prod.docker.yml` and `.env.images.example` are inspected
- **THEN** every image default begins with the configured registry prefix and none names the upstream registry

#### Scenario: Installer registry login
- **WHEN** the installer is run with a registry user and token set
- **THEN** it logs in to `ghcr.io` before pulling, passes the token on standard input, and never prints it

#### Scenario: Pull denied
- **WHEN** the image pull fails
- **THEN** the installer's error explains that registry authentication may be missing and names the variables to set

#### Scenario: Private download
- **WHEN** a download token is set
- **THEN** installer downloads send it as a bearer token, and without it behaviour is unchanged

### Requirement: Client server authentication is documented
The repository SHALL include a deployment document that explains how a client server authenticates
to pull the private images: the credential type and scope, how an operator logs in or configures
the installer, how credentials are rotated and revoked, how the install kit is handed over, how a
server is upgraded to a new image tag, and why the updater sidecar must not be enabled.

#### Scenario: Operator can follow it
- **WHEN** an operator with only a read-only registry credential follows the document on a fresh Linux host
- **THEN** they can log in, pull the images, start the stack and later upgrade it to a new tag without any other access to the repository

### Requirement: Version tags reuse the commit's images
Pushing a `v*` tag SHALL NOT rebuild an image whose `sha-<commit>` tag already exists for the
tagged commit. The workflow SHALL retag that image as `vX.Y.Z` and `vX.Y` (and `latest` for a
stable version), and SHALL build the image only when the `sha-` image is missing.

#### Scenario: Tag on a published commit
- **WHEN** a `v*` tag is pushed for a commit whose `sha-` images exist
- **THEN** the version tags point at those images and no image is built

#### Scenario: Tag on an unpublished commit
- **WHEN** a `v*` tag is pushed for a commit with no `sha-` image
- **THEN** the image is built and pushed with the version tags

#### Scenario: Prerelease tag
- **WHEN** a tag such as `v1.0.0-rc.1` is retagged
- **THEN** `latest` does not move

### Requirement: A push to main redeploys the test server
After all three images are published from a push to `main`, the publish workflow SHALL call the
Coolify deploy webhook of the test server using the secrets `COOLIFY_TEST_DEPLOY_WEBHOOK` and
`COOLIFY_TEST_DEPLOY_TOKEN`. The test server runs `edge`; client servers SHALL run a release tag.
When the secrets are not set the step SHALL be skipped with a notice and the workflow SHALL still
succeed. The webhook URL and token SHALL NOT appear in logs or in the repository.

#### Scenario: Merge to main
- **WHEN** a commit is pushed to `main` and the three images are published
- **THEN** the test server's Coolify resource is asked to redeploy

#### Scenario: Image publish fails
- **WHEN** any image fails to publish
- **THEN** the redeploy is not requested

#### Scenario: Tag push or manual run
- **WHEN** the workflow runs for a tag or a manual dispatch
- **THEN** no redeploy is requested

#### Scenario: Secrets not configured
- **WHEN** either secret is empty
- **THEN** the step prints a notice and the workflow succeeds
