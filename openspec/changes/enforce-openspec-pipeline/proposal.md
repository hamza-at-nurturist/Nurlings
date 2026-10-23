# Proposal

## Why

Work on this repo has been landing without a written plan: sessions commit on auto-generated
`claude/*` branches, branch names say nothing about the work, and nothing stops a code change from
skipping OpenSpec. The pipeline only helps if every session reads it first and the repository
refuses a code change that skipped it.

## What Changes

- Add two sections at the top of `AGENTS.md` (which `CLAUDE.md` already imports): the OpenSpec
  pipeline (change first, validate strictly, maintainer approval before code, work through
  `tasks.md`, archive after merge, exemptions) and branch naming (never commit on an
  auto-generated `claude/*` branch, `feature|fix|chore|brand/<change-name>` from up-to-date `main`,
  plain-word PR titles). Releases: never create or push tags; say when something is ready.
- Add a pull request check, `OpenSpec change`: when a PR changes `apps/`, `packages/`, `infra/` or `deploy/`
  it must also add or modify a folder under `openspec/changes/` (including `archive/`), unless the
  PR carries the `no-spec` label. The failure message says what to do.
- Add `.github/pull_request_template.md` with the linked change, what changed, how it was verified,
  and a checklist (spec validated, tasks ticked, tests pass, archive after merge).
- The `no-spec` label has to exist in GitHub for the escape hatch to be usable; it is created by
  the maintainer if this session cannot.
- Internal identifiers stay as they are. Nothing contacts Rakazo-owned infrastructure. No
  application code changes, so upstream merges are unaffected apart from `AGENTS.md`, which gains
  a block at its top and keeps the upstream bullets unchanged below it.

## Capabilities

### New Capabilities

- `contribution-workflow`: how changes are proposed, branched, reviewed and released in this repo,
  and the PR check that enforces the spec requirement.

### Modified Capabilities

None.

## Impact

- `AGENTS.md`, `.github/pull_request_template.md`, `.github/workflows/openspec-check.yml`,
  `scripts/ci-openspec-check.sh` and its unit test.
- Every future PR that touches `apps/`, `packages/`, `infra/` or `deploy/` needs an OpenSpec folder or the
  `no-spec` label. Docs-only, CI-only, dependency-bump and typo PRs are unaffected by the check
  (they touch none of those folders, or take the label) and say so in the PR description.
- This change itself goes through the pipeline it introduces: proposed, validated, archived.
