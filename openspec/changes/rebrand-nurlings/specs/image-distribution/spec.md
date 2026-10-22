## ADDED Requirements

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
- **WHEN** the repository name contains uppercase letters
- **THEN** the image references used by the workflow are lowercase and valid

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
