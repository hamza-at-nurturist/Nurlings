# Proposal

## Why

The fork is 536 upstream commits behind `elie222/rakazo` `main` (merge base `9375bced`, about 2,375
files changed). Keeping close keeps future merges cheap and brings upstream's fixes and features:
the settings Models tab, the hosted compatible endpoint catalog and model routing from it, MCP
source presets served from the server, the approval-rule picker, MCP launch-arg credential
redaction, Spaces deletion safeguards, account deletion recovery, voice fixes, shared web and mobile
helpers, the thread event reducer, `ConfirmDialog`, the Artifacts tab redesign, mobile fixes,
"Upgrade" when a computer runs out of hours, pnpm 12.18.0 and CI changes.

## What Changes

- Merge `upstream/main` into `chore/upstream-sync-2026-11-06` (cut from `main`) with a merge commit.
  No squash, rebase or cherry-pick.
- Take upstream for everything except what is ours: branding and the brand seam, the `NUR` prefix,
  billing off, `#hex::shape_N` bot colors, "Run actions without asking" default OFF, bot-panel
  expand, the instructions fullscreen editor, avatar art and working states, the asleep preview, the
  caveman skill, Coolify files, `AGENTS.md`, OpenSpec, the fork's CI and release workflows, the board
  and tickets work, the Nest dashboard and dashboards with live JSON data.
- Mini apps are not on `main` (they live on `feature/mini-apps`); this merge does not bring them back.
- Upstream's "star us on GitHub" prompt stays unmounted and no link to the upstream repository or
  site ships.
- Artifacts tab: upstream's header, empty state and "All files / Made by bots" picker, with "Made by
  bots" as the default so uploads stay hidden (see the spec delta). Our client-side Uploads chip is
  removed: upstream's server filter uses the same rule (a file with a run) and "All files" shows
  uploads.
- Upstream's new workspace package `packages/page-kit` arrives with upstream's Dockerfile COPY line,
  which merges cleanly.

### Conflict list and resolution

91 files conflict (89 content, 2 modify/delete).

| File | Resolution |
| --- | --- |
| `AGENTS.md`, `README.md`, `CHANGELOG.md` | Keep ours. Upstream's changelog, review-bot and Vercel rules do not apply. |
| `.github/workflows/{ci,release-desktop,release-mobile,release-android-apk}.yml` | Keep the fork's jobs (Linux and Windows desktop from this repo, no update feed, release checks, brand guard). Take upstream's step and version changes that do not touch those, including pnpm 12.18.0. |
| `apps/desktop/package.json`, `apps/mobile/package.json`, `packages/{auth,ui-web}/package.json` | Upstream's dependency versions (its Expo versions equal what `main` already pins) plus our `@nurlings/brand` and Expo extras; keep `productName` Nurlings and the Nurturist AI author. |
| `pnpm-lock.yaml` | Upstream's, then `pnpm install --lockfile-only` for our workspace links, then `--frozen-lockfile`. |
| `apps/desktop/src/i18n.ts`, `apps/mobile/lib/i18n.ts`, `packages/auth/src/{welcome-email.tsx,email.test.ts}`, `apps/mobile/lib/locales/{es,zh-TW}.ts` | Upstream's new keys and helpers; our helpers still rebrand the template; catalogs stay identical to upstream. |
| `apps/web/src/locales/*/messages.po` (14) | Take upstream's, then re-run `intl:extract` so our board, ticket and dashboard strings come back. |
| `apps/desktop/src/{package-metadata,release-workflow}.test.ts`, `apps/desktop/e2e/setup.spec.ts` | Our brand and fork release assertions plus upstream's new ones. |
| `packages/contracts/src/client-build.ts`, `apps/web/src/components/SidebarFooter{,.test}.tsx` | Keep ours: store links come from the brand and are hidden when unset. Upstream's org-switcher changes are taken around it. |
| `packages/contracts/src/domain.ts` | `SUBMIT_PLUGIN_URL` stays `null`; take upstream's integration-claim API paths; upstream's `integrationPageUrl` to its site is not linked from the app. |
| `apps/www/src/site.ts`, `apps/web/src/pages/{Auth,Onboarding}.tsx`, `apps/web/vite.config.ts` | Upstream's new logic with our brand values and the brand-blob default avatar. |
| `apps/web/src/pages/Welcome.tsx` (deleted upstream), `apps/web/e2e/github-star-prompt.spec.ts` (deleted by us) | Take upstream's delete: sign up and sign in now open directly. Our only edits were the page's branding, which `Auth.tsx` already carries. Keep the star-prompt spec deleted, since the prompt is not mounted. |
| `packages/core/src/bot-avatar-shapes.ts`, `packages/ui-web/src/bot-avatar{,.test}.tsx`, `apps/mobile/components/bot-avatar.tsx`, `apps/mobile/lib/bot-avatar-render.test.tsx`, `packages/core/src/bot-avatar-colors.test.ts`, `apps/web/src/pages/shell/{avatar-studio-popover,create-bot-dialog,create-bot-dialog.test}.tsx`, `apps/web/e2e/avatar-motion.spec.ts`, `apps/mobile/components/bot-mention.tsx` | Upstream's shared eyes, avatar identity and sets, merged with our brand-mark shape, richer art, working states and asleep preview; `#hex::shape_N` still parses. |
| `apps/web/src/pages/shell/message-view.tsx` | Upstream's `otherAuthor` and persona color; our `botHexColor` unwraps `#hex::shape_N` before resolving it. |
| `apps/web/src/pages/Artifacts.tsx`, `apps/web/e2e/artifacts-tab.spec.ts` | Upstream's header, empty state, preview kinds and "Made by bots" picker, defaulting to "Made by bots". Keep the dashboard `loadData` on the HTML viewer. |
| `apps/web/src/components/{SandboxedHtmlViewer,ArtifactFileCard}.tsx`, `apps/web/public/html-viewer.html` | Both: upstream's frame-message channel with gesture guard and our `nurlings:data` relay for dashboards; the relay keeps its own message type so neither path accepts the other's messages. |
| `packages/adapters/src/{run-tools-memory,memory-tools,memory-tools.test}.ts` | Upstream's `editMemory` on the single memory index; our ticket ref tag is applied to the text a run adds. |
| `packages/adapters/src/{job-reconciler,background-job-handlers}.ts`, `apps/worker/src/index.ts` | Upstream's `startHousekeeping`; our `reconcileTicketDates` and `ticketBoardEnabled` move into it. |
| `apps/api/src/routes/{boards,account}.ts`, `apps/api/src/messaging-inbound.ts` | Both sides' imports and handlers: our approve, attachments, human-only delete and `DEFAULT_AUTO_REVIEW` (OFF) next to upstream's `commitBotUpdate`. |
| `packages/adapters/src/{skill-tools,run-trust,pi-models,executor-lazy-computer.test}.ts` | Upstream's renamed builtin skill list with our caveman and dashboard skills offered; our brand in `pi-models` with upstream's endpoint catalog and routing. |
| `apps/web/src/pages/shell/{composer,computer-panel}.tsx` | Upstream's dictation path and draft events, keeping our draft request subscription; upstream's "Upgrade" with billing off still hidden. |
| `apps/mobile/{app.json,app/paywall.tsx,lib/push.ts}`, `apps/mobile/.maestro/*.yaml`, `docs/mobile-release.md` | Our app id, name and brand; upstream's BYOK interval and push changes; billing off. |
| `apps/web/e2e/*` (other) | Upstream's selectors with our `ui()` wording and brand. |

Every resolution beyond imports is recorded again in the merge commit and the PR.

## Risks

1. **Migrations (34 new, all upstream, dated after ours).** All add tables, columns or indexes, or
   relax `NOT NULL`. Two drop indexes concurrently; `drop_message_history_search_idx` is
   `-- deferred`. None touch ticket tables. Our ticket migrations are already applied and sort
   earlier. Checked by applying every migration to an empty Postgres.
2. **Environment.** No new required variable; Coolify compose is untouched.
3. **Not a release.** No tag is created or pushed.

## Impact

- Capabilities: `artifacts-tab` (added: uploads stay hidden by default under upstream's filter).
- About 2,400 files; almost all of it is upstream code.
