# Proposal

## Why

Two CI problems showed up while merging a run of small pull requests.

1. The "publish Playwright report" workflow failed on every pull request whose paths skip Web E2E
   (a docs-only or deploy-only change). It looks for the aggregate "Web E2E" job, finds none, and
   stops with "expected exactly one Playwright job". There is nothing to publish in that case, so
   it should say so and finish green.
2. A CI run for a merge to `main` was cancelled without ever starting. The `ci` workflow shares
   one concurrency group between all pushes to `main`, and a group holds one running run and one
   waiting run. When a third merge arrives, it replaces the waiting run, so `cancel-in-progress:
   false` does not protect it. The merged commit then has no CI result on `main`.

## What Changes

- **Report workflow.** When the CI run has no Web E2E job (or it was skipped), the first step
  prints a notice, records that no report ran, and ends successfully. Every later step is
  skipped. The gallery fix from the earlier change is unaffected.
- **Main is never cancelled.** The `ci` concurrency group is the pull request number for pull
  requests (so a new push still replaces the older run) and the commit SHA for everything else,
  so every `main` push has a group of its own and runs to completion.
- Tests: the job-lookup filter is run against fixtures (no job, a skipped job, one job,
  duplicates); the later steps are checked to be gated; the CI group expression is checked to use
  the number for pull requests and the SHA, not the branch ref, otherwise.

Not changed: the job-level groups that deliberately serialize production deploys, mobile updates
and test-server redeploys. They keep one running and one waiting run, so a stale waiting deploy is
replaced by the newer one, which is what a deploy queue should do.

## Impact

- Capability: `ci-pipeline`.
- Pushes to `main` can now run in parallel with each other. They only read the repository and the
  jobs that publish or deploy serialize themselves, so this costs runner time, not correctness.
- No application code, no migration.
