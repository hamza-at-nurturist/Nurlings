## MODIFIED Requirements

### Requirement: Upstream-only jobs stay off the fork

Jobs that publish to upstream's Expo project, deploy to upstream's host, push upstream's images,
run its dependency agent, release its App Store app or build on its hosted Xcode 27 runner SHALL
run only in `elie222/rakazo`, and the brand guard SHALL run with lint and again on the built web
app.

#### Scenario: A push to main on the fork

- **WHEN** a commit is pushed to the fork's `main`
- **THEN** the mobile update, production deploy, server image and weekly dependency jobs do not run, and the brand checks do

#### Scenario: A pull request changes the iOS native setup

- **WHEN** a pull request on the fork changes `apps/mobile/app.json` or a mobile plugin
- **THEN** the iOS Simulator build job is skipped, not queued for a runner the fork does not have
