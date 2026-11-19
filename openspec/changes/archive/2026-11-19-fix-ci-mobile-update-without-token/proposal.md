# Proposal

## Why

The "Publish compatible mobile update" job in the `ci` workflow fails the whole run on `main`
whenever a merge changes mobile-safe code and the `EXPO_TOKEN` repository secret is not set. The
secret points at an Expo project this fork does not use (mobile over-the-air updates are off in
the rebrand), so the failure says nothing is wrong with the change, yet it turns the merge red.

## What Changes

- The step that required the token becomes a check that records whether the token is set. When it
  is not, it prints a notice and writes a short note to the job summary, and succeeds.
- Every later step of the job (tooling setup, install, verification, publish) runs only when the
  token is set. With the token set, behaviour is unchanged.
- A test pins the check, the notice, the absence of a failing exit, and the gating of each later
  step.

Not changed: the rule that decides whether a change is safe for an update, the publish step's
check that the commit is still the head of `main`, and the Android release workflow, which still
requires the token because it only runs on a release.

## Impact

- Capability: `ci-pipeline`.
- Merges to `main` no longer go red for a missing Expo token. Someone who later enables mobile
  updates sets the secret and the job publishes as before.
- No application code, no migration.
