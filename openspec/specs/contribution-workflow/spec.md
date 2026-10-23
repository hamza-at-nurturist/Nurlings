# contribution-workflow Specification

## Purpose
Defines how changes are proposed, branched, reviewed and released in this repository: every change starts as an OpenSpec change, work is branched by kind and named after its change, tags are cut by the maintainer, and a pull request check and template enforce the process.

## Requirements

### Requirement: Changes start with an OpenSpec change
Every feature, bug fix or behaviour change SHALL start with an OpenSpec change: a proposal and
tasks always, a spec delta when behaviour changes, and a design when there are real decisions.
Documentation-only, CI-only, dependency-bump and typo-fix work is exempt and SHALL say so in the
pull request description.

#### Scenario: Small bug fix
- **WHEN** a small bug is fixed
- **THEN** it still has an OpenSpec change, and a proposal and tasks are enough

#### Scenario: Exempt work
- **WHEN** a pull request only changes documentation
- **THEN** it needs no OpenSpec change and its description says it is exempt

### Requirement: The change is approved before code and followed to the end
The change SHALL pass `openspec validate <change> --strict` and be approved by the maintainer
before any code is written. It SHALL be implemented by working through `tasks.md`, ticking tasks
as they finish, and archived after its pull request merges.

#### Scenario: Approval before code
- **WHEN** a proposal has been written and validated
- **THEN** no code is written until the maintainer approves it

### Requirement: Work is branched by kind and named after its change
Work SHALL NOT be committed on an auto-generated `claude/*` branch. Before the first commit a
branch SHALL be created from up-to-date `main`, named `feature/<name>`, `fix/<name>`,
`chore/<name>` or `brand/<name>` after the OpenSpec change, and pull request titles SHALL describe
the change in plain words.

#### Scenario: Branch for a new feature
- **WHEN** the change `the-nest-dashboard` is implemented
- **THEN** its branch is `feature/the-nest-dashboard`

### Requirement: Releases are cut by the maintainer
Contributors and agents SHALL NOT create or push tags. They SHALL tell the maintainer when
something is ready to release.

#### Scenario: Work ready to release
- **WHEN** merged work is ready to ship
- **THEN** the maintainer is told and no tag is created or pushed

### Requirement: Code changes require an OpenSpec change
A pull request that changes files under `apps/`, `packages/`, `infra/` or `deploy/` SHALL also add or modify
a folder under `openspec/changes/` or `openspec/changes/archive/`, unless it carries the label
`no-spec`. The `OpenSpec change` check SHALL fail otherwise, with a message saying to add a change
or apply the label, and SHALL re-run when labels are added or removed.

#### Scenario: Code without a change
- **WHEN** a pull request changes `apps/web/src/main.tsx` and nothing under `openspec/changes/`
- **THEN** the check fails and says to add an OpenSpec change or apply `no-spec`

#### Scenario: Code with a change
- **WHEN** a pull request changes `packages/brand/brand.json` and adds `openspec/changes/redraw-x/proposal.md`
- **THEN** the check passes

#### Scenario: Archive pull request
- **WHEN** a pull request only moves a change into `openspec/changes/archive/`
- **THEN** the check passes

#### Scenario: Opt-out label
- **WHEN** a pull request changes `infra/updater/src/index.ts`, has no OpenSpec folder and carries `no-spec`
- **THEN** the check passes

#### Scenario: Deployment files
- **WHEN** a pull request changes `deploy/coolify/docker-compose.yml` and nothing under `openspec/changes/`
- **THEN** the check fails and says to add an OpenSpec change or apply `no-spec`

#### Scenario: Not code
- **WHEN** a pull request only changes `.github/workflows/ci.yml` or `README.md`
- **THEN** the check passes without a change or label

### Requirement: Pull requests use a template
Pull requests SHALL be opened from `.github/pull_request_template.md`, which asks for the linked
OpenSpec change, what changed, how it was verified, and a checklist: spec validated, tasks ticked,
tests pass, archive after merge.

#### Scenario: Opening a pull request
- **WHEN** a pull request is opened
- **THEN** its description starts with those four sections
