# Tasks

> Scope: workflow rules, the PR check and the PR template. No application code. Nothing is
> committed before the maintainer approves the proposal and the AGENTS.md text (task 1.1).

## 1. Rules

- [x] 1.1 Maintainer approves the proposal and the AGENTS.md text. Verify: explicit approval in the session.
- [x] 1.2 Add the OpenSpec pipeline, branch naming and releases sections at the top of `AGENTS.md`; confirm `CLAUDE.md` imports it. Verify: `head -40 AGENTS.md` shows the sections before the existing bullets, and `cat CLAUDE.md` shows `@AGENTS.md`.

## 2. PR check

- [x] 2.1 Add `scripts/ci-openspec-check.sh` (changed paths on stdin, labels in `PR_LABELS`) with a vitest file beside `ci-docs-only.test.ts`. Verify: tests cover code without a change, with a change, archive-only, `no-spec`, non-code paths and an empty list, and pass.
- [x] 2.2 Add `.github/workflows/openspec-check.yml` (job `OpenSpec change`, on opened, reopened, synchronize, labeled, unlabeled; read-only permissions). Verify: a workflow test parses it and asserts the triggers and permissions; the check runs on this pull request.
- [x] 2.3 The maintainer creates the `no-spec` label and sets `OpenSpec change` as a required check after merge. Verify: reported to the maintainer in the PR.

## 3. Template

- [x] 3.1 Add `.github/pull_request_template.md` (linked change, what changed, how verified, checklist). Verify: the PR for this change renders it with the sections filled in.

## 4. Review and release

- [x] 4.1 `openspec validate enforce-openspec-pipeline --strict`, `pnpm lint` and the updater tests pass. Verify: commands succeed.
- [x] 4.2 Open the PR from `chore/enforce-openspec-pipeline`, wait for CI and review bots, merge when green. Verify: PR merged with checks green.
- [x] 4.3 Archive the change after the merge in its own PR. Verify: `openspec/changes/archive/` holds it and `openspec/specs/contribution-workflow` exists.
