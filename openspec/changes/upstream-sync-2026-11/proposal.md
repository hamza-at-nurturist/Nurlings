# Proposal

## Why

The fork is 699 upstream commits behind `elie222/rakazo` `main` (merge base `1b3ed393`, upstream
head `14101fca`), and upstream adds about a hundred a day. Every day we wait makes the next merge
bigger, so we sync now with a real merge commit (no squash, no cherry-pick) to keep later syncs
cheap. The merge brings credit plans and paid model connections, shared MCP servers with a smaller
core toolset, bots that edit their own instructions and settings with approval, the Anthropic
Messages protocol option, an audit log, the approval replay fix, a native mobile board, Shortcuts,
iPad, routines and bot profiles on mobile, and a new Spanish mobile locale, without losing
Nurlings branding, fork infrastructure or the ticket board.

## What Changes

- Merge `upstream/main` into `chore/upstream-sync-2026-11` (cut from `main`) with one merge commit.
  Fix conflicts in small commits grouped by area (workflows, API, mobile, web, locales, deploy).
- Keep what is ours: Nurlings branding and fork infra, board and ticket routes, `asTenant`
  wrapping, ticket hooks and the `ticket.dates` job, the `NUR` prefix, the "run actions without
  asking" default OFF, the `#hex::shape_N` bot color format, the Coolify labels and README step, our
  marketing pages. Take everything else from upstream, including new tests and new locale keys.
- **Move our mobile Board and Ticket screens to `/nurlings/board` and `/nurlings/ticket`.** They
  currently live in `app/(nurlings)/`, a group that adds no path segment, so `/board` is ours today
  and upstream's new `app/board.tsx` (#2859) would collide with it. Upstream's board stays in the
  tree, untouched and unlinked.
- Gate anything upstream enforces for billing behind billing being configured (see design).
- Pass `RAKAZO_ADMIN_EMAILS` through the Coolify compose as an optional variable with an empty default (never commit an email; the maintainer sets the value in Coolify), because stdio MCP servers become
  admin-only upstream (see design).
- Fix the one migration collision found in advance (see "Database").

### Before anything else: back up the database

Take a `pg_dump` of the production database on the Coolify server before the merge is deployed,
and keep the dump until the new release has run for a day. Suggested command (run on the server,
adjust the container name):

```bash
docker exec <postgres-container> pg_dump -U <db-user> -Fc <db-name> > nurlings-pre-sync-2026-11.dump
```

The merge itself does not need the backup (it is a git change). The deploy does, because it runs
54 new migrations, some of which drop columns and tables. Implementation does not start before you
confirm the backup exists.

### Database: new migrations and ordering

Upstream added 54 migrations, `20261024150000_model_roles` through
`20261112120000_bot_cross_space_default_on`. Ours (`20261024130000_ticket_events` through
`20261025150001_artifacts_runid_idx_concurrent`) interleave with the first dozen of theirs by
timestamp. They touch disjoint tables (`tickets`, `ticket_*`, `tasks`, plus indexes on `runs` and
`artifacts`), so applying them in name order on a fresh database is fine, and on production only
the unapplied upstream ones run. The full list is in `design.md`.

**They are not all additive.** Findings:

1. **Name collision (breaks the deploy).** Upstream `20261025210001_runs_task_id_idx_concurrent`
   runs `CREATE INDEX CONCURRENTLY "runs_taskId_idx" ON "runs"("taskId")`. Our
   `20261025150000_runs_taskid_idx_concurrent` created the same index, already applied in
   production. Upstream's would fail with "already exists", and `prisma migrate deploy` would stop.
   Fix: add `IF NOT EXISTS` to the upstream file (it is unapplied in production, so no checksum
   problem; upstream does not edit migration files after the fact, so no future conflict). Listed in
   "Upstream overlap". Our `artifacts_runId_idx` has no upstream twin.
2. **Destructive migrations the previous release still reads.** Dropped: `bots.title`,
   `bots.selfUpdateInstructions`, `bots.pendingInstructionsRunId`,
   `space_model_preferences.isDefault` (plus two indexes), tables `space_backup_models`,
   `account_source`, `space_setting_signatures`, `billing_card_fingerprints`, and
   `referrals.createdAt/rewardKind/declinedAt`. Upstream ships these a release after the code
   stopped reading them; we jump 699 commits in one deploy, so the old API running side by side for
   a few seconds would hit missing columns on `bots` and `space_model_preferences` queries.
3. Backfills (`UPDATE`/`INSERT ... SELECT`) run in several migrations (model roles, account
   settings, vault credentials, referral outcome, `hasArgs`). They are one-off and additive in
   effect. `audit_events` revokes `UPDATE` on the new table from `rakazo_app`; nothing old reads it.

**Decision (maintainer, approved):** apply all migrations in one deploy, no two-step. Our
deployments are the test server and a few client servers redeployed at quiet hours, so a brief error
window while the old API runs against the migrated schema is accepted. This is a deliberate
**exception to the AGENTS.md side-by-side migration rule**, and the PR description states it. Upstream's
migrations stay unchanged except the `IF NOT EXISTS` fix in point 1. A runbook note for client servers
(back up, deploy at a quiet hour, expect a brief error window) goes in `docs/nurlings-deployment.md`.

### Conflict list and planned resolution

A dry-run merge reports 97 conflicted files. Final list is whatever the real merge shows; grouped by
your policy:

| Policy | Files (from the dry run) | Resolution |
| --- | --- | --- |
| 1. Rebrand surface | `.github/workflows/{ci,publish-playwright-report,publish-server-image,release-android-apk}.yml`, `AGENTS.md`, `apps/desktop/{package.json,src/browser-auth.ts,e2e/local-stack.spec.ts}`, `apps/mobile/{app.config.ts,app.json,eas.json,app/index.tsx}`, mobile locales `de/ja/nl/ru/zh` plus `i18n.test.ts`, mobile `bot-avatar.tsx`, `thread-composer.tsx` and their tests, `docs/mobile-release.md`, `packages/ui-web/src/{bot-avatar.tsx,index.ts}`, `packages/contracts/src/bot-avatar.ts`, web `src/{App,pages/Auth,pages/Shell,pages/shell/message-view,components/SidebarFooter,components/ArtifactFileCard}`, `vite.config.ts`, 13 `messages.po`, about 20 web E2E specs and `e2e/helpers.ts`, `infra/updater` tests, `packages/core/src/compose-update.test.ts`, `packages/auth` (`index.ts`, `account-security.ts`, `package.json`), `packages/adapters/{package.json,pi-models.test.ts,pi-runtime.ts}` | Keep Nurlings branding and fork infra (`ghcr.io/hamza-at-nurturist/nurlings/app`, feed/owner settings, appId, the android-preview flow in `release-android-apk.yml`). Take upstream behavior, new tests and new locale keys; add new keys to our locale files. The new `es` and `zh-TW` mobile locales come from upstream and get the same brand pass as our locales. New branded emails (referral, day-1) use `brand` or stay off. |
| 2. API | `apps/api/src/{router.ts,router.test.ts,app.ts,ai-consent.ts,messaging-inbound.ts,messaging-inbound.test.ts}`, `apps/worker/src/index.ts`, `packages/adapters/src/{executor.ts,executor-lazy-computer.test.ts,job-reconciler.ts,background-job-handlers.ts,builtin-tools.ts,ticket-tools.ts,history-compaction.test.ts,mcp-oauth.test.ts}`, `packages/db/prisma/schema.prisma` | Keep our board/ticket routes, `asTenant` wrapping, ticket hooks and the `ticket.dates` job; take the rest from upstream. `schema.prisma`: union of both models. |
| 3. Mobile layout | `apps/mobile/app/_layout.tsx` (merges clean in the dry run, but is semantically in play) | Keep our splash and board screens, take upstream's Android permission onboarding, Shortcuts, iPad, routines, bot profile. |
| 4. Board collision | Not a git conflict: both `app/(nurlings)/board.tsx` and upstream `app/board.tsx` resolve to `/board`. | Move ours to `app/nurlings/` (see design). |
| 7. Marketing | `apps/www` (83 upstream files changed) | No conflicts reported; we do not take upstream's Grok Bot alternatives page or other Rakazo marketing copy (remove them if they arrive). |
| 8. Coolify | `deploy/coolify/*` | No conflicts reported; verify the label and README step survive, take other upstream compose changes that apply to the Coolify file, keep the compose tests green. |
| 9. Anything else | `pnpm-lock.yaml`, `packages/auth/package.json` | Regenerate the lockfile with `pnpm install` after resolving `package.json` files, not by hand. |

### Upstream behavior to confirm after the merge (called out in the PR)

Approval replay fix; shared MCP servers and the smaller core toolset; bots editing their own
instructions and settings with approval; the Anthropic Messages protocol option; stdio MCP now
admin-only (check our setup still works); the audit log.

## Impact

- Capabilities: `mobile-board` (routes move to `/nurlings/...`, a Settings entry points at our
  board, link and push taps keep working), `coolify-deployment` (admin emails passthrough),
  `user-facing-branding` (new upstream strings get the brand pass; expected unchanged).
- About 2,500 files change, mostly upstream code already reviewed upstream.
- Adds 54 migrations in one deploy.
- Not a release. No tag is created or pushed; I will tell you when it is ready for you to cut one.

## Timing

PR #71 (layout fix) is merged. PR #72 (board touch drag) is still open and touches `board.tsx` and
the web `BoardView.tsx`, both in this sync's path. The merge starts from `main` only after #72
merges. If #72 is still open when you approve, I stop and ask you before continuing.
