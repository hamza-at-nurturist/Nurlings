# Design

## Approach

One merge commit of `upstream/main` (`14101fca`) into `chore/upstream-sync-2026-11`, cut from `main`
after PR #72 merges. Conflicts are resolved in follow-up commits, one per area: workflows and CI,
API and worker, adapters and schema, mobile, web, locales, deploy. After the merge, a handful of
"fix the fallout" commits (route move, billing gate, admin emails, migration fixes). No squash, no
rebase, no cherry-pick, so the next sync's merge base is this merge.

Local branch tracking is unset, so a plain `git push` cannot go to `main`; the branch is pushed
explicitly.

## Decisions

### 1. Migrations

54 new upstream migrations, all `packages/db/prisma/migrations/*`, none modified, none removed.

Ordering against ours. Prisma applies unapplied migrations in name order on a fresh database, and
on production only applies the ones not yet in `_prisma_migrations`. Ours:

| Ours                                                                                                           | Touches                               |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `20261024130000_ticket_events`, `20261024140000_ticket_mentions`                                               | `tickets`, `ticket_events`, `tasks`   |
| `20261025120000_ticket_needs_user`, `20261025130000_ticket_comment_attachments`, `20261025140000_ticket_dates` | `tickets`, `ticket_comments`, `tasks` |
| `20261025150000_runs_taskid_idx_concurrent`, `20261025150001_artifacts_runid_idx_concurrent`                   | indexes on `runs`, `artifacts`        |

Upstream's first dozen (`20261024150000_model_roles` to `20261025210003_*`) sort between and after
ours. No upstream migration alters `tickets`, `ticket_*` or `tasks` columns; the only overlap is the
duplicate `runs_taskId_idx` below. New migrations of ours after the sync use a timestamp later than
`20261112120000` so they sort after everything upstream has shipped.

Classification (everything else is a new table, a new nullable or defaulted column, a new index or
a backfill):

| Migration                                           | Statement                                                               | Previous release reads it?      | Plan                              |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | --------------------------------- |
| `20261025210001_runs_task_id_idx_concurrent`        | `CREATE INDEX "runs_taskId_idx"` duplicates ours                        | n/a                             | Edit to `IF NOT EXISTS` (overlap) |
| `20261025140000_drop_space_backup_models`           | `DROP TABLE space_backup_models`                                        | maybe                           | Ships (approved exception)        |
| `20261025180000_drop_model_preference_default`      | drop `isDefault` + 2 indexes                                            | yes (`space_model_preferences`) | Ships (approved exception)        |
| `20261025200000_account_settings`                   | `DROP TABLE account_source, space_setting_signatures` after moving data | yes                             | Ships as is (approved exception)  |
| `20261102120000_drop_unused_referral_tables`        | drop `billing_card_fingerprints`, `referrals.createdAt`                 | no (new tables)                 | Safe, ships                       |
| `20261103120000_drop_dead_bot_and_referral_columns` | drop `bots.title`, `bots.selfUpdateInstructions`, referral columns      | yes for `bots`                  | Ships (approved exception)        |
| `20261108120000_drop_pending_instructions_run`      | drop `bots.pendingInstructionsRunId`                                    | yes                             | Ships (approved exception)        |
| `20261104120001..3_*_drop_concurrent`               | drop three indexes                                                      | performance only                | Ships                             |
| `20261029150000_space_availability`                 | drop `secrets_scope_check`                                              | relaxes a check                 | Ships                             |
| `20261109120000_audit_events`                       | `REVOKE UPDATE` on the new table                                        | no                              | Ships                             |

Maintainer decision: all migrations apply in one deploy, unchanged except the `IF NOT EXISTS` fix.
Nothing is held back. This knowingly breaks the side-by-side rule for the rollout window (queries on
`bots`, `space_model_preferences` and the dropped tables fail on the old API until it is replaced),
accepted because deploys are the test server and a few client servers at quiet hours. The runbook
note tells operators to back up, deploy at a quiet hour and expect a brief error window.

Verification: `prisma migrate deploy` on a fresh database, then on a restored copy of the current
production schema (dump of the last released state), and `prisma migrate diff` between the migrated
database and `schema.prisma` shows no drift.

### 2. Board and ticket routes

Today `app/(nurlings)/board.tsx` and `ticket.tsx` resolve to `/board` and `/ticket`. After the
merge upstream's `app/board.tsx` also resolves to `/board`; Expo Router would pick one by file
order, silently.

Change: `git mv app/(nurlings) app/nurlings`. Routes become `/nurlings/board` and `/nurlings/ticket`.
Update every reference (all in fork-owned files except two single lines):

- `app/index.tsx` header Board button, two `router.push("/board")` calls (fork edit, minimal).
- `app/nurlings/board.tsx`: `router.push({ pathname: "/nurlings/ticket", ... })`.
- `lib/nurlings-board/notification.ts` and its type: `pathname: "/nurlings/ticket"`; tests updated.
- `lib/notification-open.ts` target type if it names the paths.
- `rakazo://ticket` deep link and `rakazo://board`: still accepted. `+native-intent.tsx` rewrites an
  incoming `/ticket` or `/board` link to `/nurlings/...` before routing (needed because upstream's
  `/board` now exists and `/ticket` would 404). Push payloads already delivered to devices keep
  working because they carry the link or the ticket id, not the path.
- `_layout.tsx`: register `nurlings/board` and `nurlings/ticket` screens with the same options as
  today.
- `account.tsx` upstream line 715: `href: "/board"` becomes `"/nurlings/board"`, one line. It is the
  Settings > Board entry; it stays gated on `ticketBoardEnabled`.
- Upstream's `app/board.tsx`, `components/board-list*.tsx`, `lib/board.ts` and tests are not edited
  and not deleted. After the repoint nothing links to `/board`, so their screen is unreachable; it
  still typechecks and its tests still pass. If upstream's `_layout.tsx` registers a `board`
  screen, it stays registered.
- Test: a mobile test asserting that the home Board button, the Settings entry, a ticket
  notification tap and `rakazo://board` / `rakazo://ticket` links all resolve to our
  `/nurlings/...` screens, and that no navigation target equals `/board`.

PR #72 changes `board.tsx` and `BoardView.tsx` (uses a shared `isMoveTarget`). The move happens
after it merges, so the rename carries its changes; no concurrent edits.

### 3. Billing off must stay off

Upstream gates credits on `deps.billing?.modelCreditsEnabled` (hosted provider, onboarding "credits"
option, account routes, consent) and shows paywall UI from the bootstrap `billingEnabled`. Two
different expressions are used: `routes/shared.ts` sets `billingEnabled: Boolean(deps.billing)`,
`app.ts` sets it from `modelCreditsEnabled`. With no Stripe variables `deps.billing` is undefined,
so both are false today. The risk is a code path added by the 699 commits that checks credits or an
allowance without that guard (run dispatch, computer allowances, own-connection charges, the
`SubscriptionGate`, Settings entries, upgrade buttons, mobile paywall screens).

Plan: after the merge, audit the credit, plan, allowance and paywall checks in the API, adapters,
worker, web and mobile. Anything found that is not behind `deps.billing` or `billingEnabled` gets
gated, with the lowest-level guard (server side), and is noted in the PR. Add API and web tests with
billing unset: a bot run is not blocked, no paywall renders, no upgrade button or credit meter
appears, Settings has no billing section, mobile shows no credit UI.

### 4. Stdio MCP is admin-only

Upstream `assertMcpStdioAdmin` allows only users listed in `RAKAZO_ADMIN_EMAILS` (verified email,
lowercased). Our Coolify compose passes the `MCP_STDIO_*` variables but not `RAKAZO_ADMIN_EMAILS`, so
after the sync nobody could add or change a stdio server, and existing ones would only run for as
long as nobody edits them. Fix: pass `RAKAZO_ADMIN_EMAILS` through in `deploy/coolify/docker-compose.yml`
(optional, empty default, never an email in the repo; matching the compose-env allowlist test), document it next to
`MCP_STDIO_ENABLED` in `docs/nurlings-deployment.md`. The operator must set it in Coolify to the
admin account's email. Existing stdio servers keep running; checking this is a post-merge task.

### 5. Defaults we keep

- "Run actions without asking" default OFF: after the merge, check the default of the upstream
  setting that holds it (account settings, approval rules, new approval replay code) is still false
  for new users and for the new `user_action_approval_rules` backfill, with a test.
- Bot color `#hex::shape_N`: only the `#hex` before `::` is the color, including mention chips.
  `packages/contracts/src/bot-avatar.ts` conflicts, which is where upstream parses colors. Keep the
  tolerant parse and test mention chips.
- `NUR` ticket prefix; board and ticket modal designs unchanged.

### 6. Marketing site and Coolify

- `apps/www`: keep ours. If upstream pages (Grok Bot alternatives, other Rakazo copy) arrive in the
  merge they are deleted in a "Keep our marketing pages" commit and the sitemap/nav are checked.
- Coolify: keep the `traefik.docker.network=${NURLINGS_PROXY_NETWORK:-${COOLIFY_RESOURCE_UUID:?...}}`
  web label and the README step to turn off "Escape special characters in labels". Take other
  upstream compose changes that apply; `coolify-compose` and `compose-env` tests must stay green.

## Upstream overlap

Files upstream changed that we also edit, with our edit kept as small as the merge allowed (written
from the real merge).

| File                                                                                                                                                                                                                          | Our edit                                                                                                                                  | Why                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `packages/db/prisma/migrations/20261025210001_runs_task_id_idx_concurrent/migration.sql`                                                                                                                                      | `IF NOT EXISTS`                                                                                                                           | Our earlier migration already created `runs_taskId_idx`; the only upstream migration edited |
| `packages/db/prisma/schema.prisma`                                                                                                                                                                                            | union of models, one duplicate `runs` index removed                                                                                       | Both sides declared `@@index([taskId])`                                                     |
| `apps/api/src/routes/boards.ts`                                                                                                                                                                                               | ticket cards, approve, events, runs, files, comment attachments and mentions                                                              | Upstream moved the board routes out of `router.ts`; our ticket handlers live there now      |
| `apps/api/src/{app.ts,ai-consent.ts,messaging-inbound.ts}`, `apps/worker/src/index.ts`                                                                                                                                        | `ticketBoardEnabled`, `ticket.dates` reconciler, brand name, privacy link from the brand                                                  | Fork features                                                                               |
| `packages/adapters/src/{run-tools-tasks,run-context,executor,run-effects,run-replies,pi-runtime,pi-runtime-subagent,ticket-tools,builtin-tools,builtin-tool-bridge,builtin-skills,job-reconciler,background-job-handlers}.ts` | ticket tools (files, dates, mentions), brand names in prompts, ticket tools in the core toolset, the built-in "Rakazo" docs skill removed | Upstream split the executor into modules; edits re-applied there                            |
| `packages/auth/src/{index,email,welcome-email,referral-email,plugin-submission-email}.ts(x)`                                                                                                                                  | brand name in every email, no upstream links or founder sign-off                                                                          | Emails moved to React Email templates                                                       |
| `packages/core/src/bot-avatar-colors.ts`, `packages/contracts/src/{bot-avatar,board}.ts`                                                                                                                                      | `#hex::shape_N` resolves to its hex; nine shapes and one selectable icon set; `Ticket` is the input type                                  | Fork defaults                                                                               |
| `packages/db/src/approval-settings.ts`, `apps/api/src/routes/account.ts`, `packages/adapters/src/run-trust.ts`                                                                                                                | one `DEFAULT_AUTO_REVIEW`, off                                                                                                            | Upstream defaults Auto Review on                                                            |
| `apps/mobile/{app.config.ts,app.json,eas.json}` and locales `de ja nl ru zh es zh-TW`                                                                                                                                         | brand identity, preview profile, Board copy                                                                                               | Rebrand                                                                                     |
| `apps/mobile/{components/inbox-header.tsx,lib/use-home-header.ts}`                                                                                                                                                            | Board button                                                                                                                              | Upstream moved the home header out of `app/index.tsx`                                       |
| `apps/mobile/app/{+native-intent.tsx,(settings)/account.tsx}`                                                                                                                                                                 | rewrite of old `board` and `ticket` links; Settings > Board href                                                                          | Route move                                                                                  |
| `apps/mobile/components/bot-avatar.tsx`, `packages/ui-web/src/bot-avatar.tsx`, `apps/mobile/components/thread-composer.tsx`                                                                                                   | brand blob shape and eyes; brand mark                                                                                                     | Fork avatar                                                                                 |
| `apps/web/src/pages/{Board.tsx,Auth.tsx}`, `components/{SidebarFooter,ArtifactFileCard}.tsx`, `pages/shell/{use-computer,message-view,avatar-studio-popover}.tsx`                                                             | `BoardView` route, brand intro animation, brand links, file meta, boot watch, brand loader, hex color                                     | Fork features                                                                               |
| `.github/workflows/{ci,publish-server-image,publish-playwright-report,release-android-apk,weekly-dependencies,release-mobile}.yml`                                                                                            | repository guards, brand checks, preview input, gallery-storage check                                                                     | Fork infra                                                                                  |
| `deploy/coolify/docker-compose.yml`, `deploy/coolify/README.md`                                                                                                                                                               | `migrate` service, upstream's new settings passed through, `RAKAZO_ADMIN_EMAILS`, the web label and README step kept                      | Take upstream compose changes                                                               |
| `infra/compose/docker-compose.{images,prod}.yml`                                                                                                                                                                              | fork registry on the new `migrate` image                                                                                                  | Registry default                                                                            |
| `apps/web/e2e/*` (about 40 specs)                                                                                                                                                                                             | `ui()` wrapping of brand wording                                                                                                          | Rebrand                                                                                     |
| Test files that pinned upstream behavior we changed                                                                                                                                                                           | updated with the change                                                                                                                   | e.g. Auto Review default, ticket owner, docs fetch allow-list                               |

## Risks

1. **Destructive migrations**: accepted exception, decision 1.
2. **Size**: 97 conflicted files and ~2,500 changed. Mitigated by grouping and by typecheck, lint
   and tests after each group.
3. **Native build**: mobile gains native modules (`expo-haptics` from #72 and whatever upstream
   added), so the result needs a new preview APK, not an OTA update.
4. **Billing leakage**: decision 3.
5. **Locale growth**: new upstream strings in web `.po` files and mobile catalogs; `brand:check`
   and the reviewed `bot → Nurling` snapshots must pass.
6. **Desktop Playwright** is not run locally; CI's virtual-display job covers it.

## Verification

`pnpm typecheck`, `pnpm lint`, unit tests across the workspace, `pnpm brand:check` (and `--built`
after a web build), `openspec validate --strict`, Prisma migrate on a fresh database and on a
restored copy of the current schema, then CI green on the PR. Native-only mobile UI cannot be
captured by CI; the preview APK after merge covers board, tickets, drag, approvals and push on a
phone.
