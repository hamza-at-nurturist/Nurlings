# Tasks

## 1. Approval and preconditions

- [x] 1.1 Maintainer approves this proposal and design, including the migration decision (apply all in one deploy, approved). Verify: explicit approval in the session.
- [x] 1.2 Maintainer confirms a `pg_dump` of the production database exists. Verify: stated in the
  session.
- [x] 1.3 PR #72 (board touch drag) is merged. Verify: `main` contains it. If it is still open at
  approval, stop and ask before continuing.
- [x] 1.4 Rebase this planning commit onto the new `main`; fetch `upstream` again and re-run the
  dry-run merge to refresh the conflict list and the migration list (upstream moves daily).

## 2. Merge

- [x] 2.1 `git merge upstream/main` (merge commit, no squash). Verify: `git log` shows upstream's
  commits, no conflict markers remain.
- [x] 2.2 Resolve rebrand-surface conflicts (policy 1): workflows, desktop, mobile config and
  locales, web E2E and `.po` files. Verify: `pnpm brand:check`; `release-android-apk.yml` still has
  the android-preview flow; new locale keys present in all our locale files.
- [x] 2.3 Resolve API conflicts (policy 2): router, app, executor, job-reconciler, worker, schema.
  Verify: ticket routes, `asTenant`, ticket hooks and `ticket.dates` job still registered; API and
  adapters tests pass.
- [x] 2.4 Resolve mobile `_layout.tsx` (policy 3). Verify: our splash, upstream permission
  onboarding, upstream additions and our board screens all register.
- [x] 2.5 Keep marketing (`apps/www`) and Coolify (policy 7, 8). Verify: Grok Bot alternatives page
  and other Rakazo copy absent; traefik label and README step present; `coolify-compose` and
  `compose-env` tests pass.
- [x] 2.6 Regenerate `pnpm-lock.yaml` with `pnpm install` (no hand edits). Verify: `pnpm install
  --frozen-lockfile` passes.

## 3. Database

- [x] 3.1 List the new upstream migrations and their order against ours. Verify: table in design
  matches the merged tree.
- [x] 3.2 Make `20261025210001_runs_task_id_idx_concurrent` use `IF NOT EXISTS`. Verify: migrate on
  a copy of the current production schema succeeds.
- [x] 3.3 Add the runbook note for client servers (back up, deploy at a quiet hour, expect a brief error window) to `docs/nurlings-deployment.md`, and state the side-by-side exception in the PR. Verify: note present.
- [x] 3.4 Run `prisma migrate deploy` on a fresh database and on a copy of the current schema.
  Verify: both succeed; the old release's queries still run against the migrated copy.

## 4. Board route move (policy 4)

- [x] 4.1 `git mv apps/mobile/app/(nurlings) apps/mobile/app/nurlings`; update the board-to-ticket
  push, home Board buttons, ticket notification target, `_layout.tsx` and docs. Verify: no
  `"/board"` or `"/ticket"` target remains in fork files.
- [x] 4.2 Redirect `rakazo://board` and `rakazo://ticket` links in `+native-intent.tsx`. Verify: a
  test for each link.
- [x] 4.3 Repoint upstream's Settings > Board entry in `account.tsx` (one line). Verify: it opens
  our board and stays behind `ticketBoardEnabled`.
- [x] 4.4 Leave upstream's `board.tsx`, `board-list*.tsx`, `lib/board.ts` and tests untouched.
  Verify: `git diff` against upstream shows no change to them; mobile typecheck and their tests pass.
- [x] 4.5 Add the test that board links and ticket push taps open our board. Verify: it fails
  against the old `/board` target.

## 5. Behavior we keep and billing off

- [x] 5.1 "Run actions without asking" defaults OFF; bot color `#hex::shape_N` parses to the `#hex`
  (mention chips too); `NUR` prefix; board and ticket modals unchanged. Verify: tests for each.
- [x] 5.2 Audit credit plans, own-connection charges and computer allowances for enforcement
  outside `deps.billing`. Gate what is found. Verify: API and web tests with no Stripe configured:
  runs not blocked, no paywall, upgrade button or credit meter; mobile shows none.
- [x] 5.3 Pass `RAKAZO_ADMIN_EMAILS` through the Coolify compose as an optional empty-default variable and document it in the README. Verify: compose
  tests pass; existing stdio MCP servers still start with it set.
- [x] 5.4 New upstream branded emails (referral, day-1) use `brand` or are off. Verify: brand check
  and an email test.

## 6. Verify

- [x] 6.1 `pnpm typecheck`, `pnpm lint`, unit tests across the workspace. The desktop Playwright
  suite is not run locally.
- [x] 6.2 `pnpm brand:check`, web build, `pnpm brand:check --built`.
- [x] 6.3 `openspec validate upstream-sync-2026-11 --strict`.
- [x] 6.4 Confirm and note in the PR: approval replay fix, shared MCP servers and smaller core
  toolset, bots editing their own instructions and settings with approval, Anthropic Messages
  protocol option, stdio MCP admin-only, audit log.
- [x] 6.5 Fill in "Upstream overlap" in the design from the real merge.

## 7. PR

- [x] 7.1 Push `chore/upstream-sync-2026-11`; open the PR "Sync with upstream rakazo (Nov 2026)"
  with why, conflicted files grouped by policy, upstream behavior adopted, what stays fork-only, how
  it was tested (in words). No local paths, account names or metrics. No tag created or pushed.
- [x] 7.2 Stay with the PR (`pr-digest --watch`) until CI finishes, fix failures, and tell the
  maintainer; the maintainer merges.
- [x] 7.3 After merge: archive this change and dispatch the preview APK build
  (`release-android-apk.yml`, input `preview`). The maintainer tests board, tickets, drag, approvals
  and push on a phone.
