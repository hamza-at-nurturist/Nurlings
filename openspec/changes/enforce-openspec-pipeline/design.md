# Design

## Decisions

- **Where the rules live.** In `AGENTS.md` only. `CLAUDE.md` already contains `@AGENTS.md`, so
  every Claude session and every other agent that reads `AGENTS.md` sees them first. The new block
  goes above the existing bullets so upstream's lines are untouched and merges stay clean.
- **Check logic in a script, not inline YAML.** `scripts/ci-openspec-check.sh` reads changed paths
  on stdin and the PR labels in an environment variable, prints a message and exits non-zero on a
  violation. This mirrors `scripts/ci-docs-only.sh` and lets a vitest unit test cover it offline.
- **Separate workflow, not a job in `ci.yml`.** The check must re-run when a label is added or
  removed (`labeled`, `unlabeled`), which would otherwise re-run all of CI. It is a small, fast
  workflow with its own required-check name, `OpenSpec change`.
- **`pull_request`, not `pull_request_target`.** The script is checked out from the PR head and the
  workflow needs only read access, so no elevated token is exposed to PR code. Labels come from the
  event payload, which is current for `labeled` and `unlabeled` events.
- **What counts as code.** Paths starting `apps/`, `packages/`, `infra/` or `deploy/`. Other
  folders (`.github/`, `scripts/`, root files, `docs/`) never trigger the requirement;
  they are the CI-only, docs-only and dependency-bump exemptions in practice.
- **What counts as a spec.** Any changed file under `openspec/changes/`, which includes
  `openspec/changes/archive/`, so the post-merge archive PR also satisfies it.

## Risks

- A PR can satisfy the check with a token change under `openspec/changes/`. The check is a guard
  rail; review and the PR template's checklist cover quality.
- The `no-spec` label must exist before it can be applied. Until it does, the failure message tells
  the author to ask the maintainer.
