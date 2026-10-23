## ADDED Requirements

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
