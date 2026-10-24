# Proposal

## Why

The fork is 137 upstream commits behind `elie222/rakazo` `main` (merge base `46eeb1c2`). The gap
grows with every day and makes the next merge bigger. This change merges upstream `main`
(`1e92d28`) into the fork, keeping upstream history, so the fork picks up the removal of the Robot
avatar style, the new create-bot dialog with a live avatar preview, the model-credits billing
rework and the reliability fixes, without losing any Nurlings branding or deployment work.

## What Changes

- Merge `upstream/main` into a branch cut from `main` with a merge commit (no squash, no rebase).
- Resolve the 21 conflicted files as listed below, keeping everything that is ours: brand package
  and rebrand, user-facing names, logos, wordmark, "Powered by Nurturist AI", Coolify deploy
  files, CI and OpenSpec workflow, `AGENTS.md`, ticket prefix `NUR`, the takeover booting fix, and
  the Expo config (slug `nurlings`, owner `nurturist-ai`, OTA off).
- Run `pnpm brand:check` (and the `--built` scan after a web build) after the merge, and fix any
  new upstream text or asset that shows "Rakazo" to users, preferably at the existing seams
  (catalog load, config generation) rather than by editing upstream strings.

### Conflict list and planned resolution

| File | Conflict | Resolution |
| --- | --- | --- |
| `.github/workflows/publish-server-image.yml` | Upstream splits the build into `build` and `build-depot` and gates `publish` on both; ours gates every job on `github.repository == 'elie222/rakazo'`. | Take upstream's job structure and keep our repository guard on each job (`build`, `build-depot`, `publish`). |
| `infra/updater/src/publish-workflow.test.ts` | Test pins the guard on `build` and `publish`. | Keep our guard assertions, extend them to `build-depot`, keep upstream's new assertions. |
| `apps/api/src/server-update.ts`, `server-update.test.ts` | Deleted upstream (#1915, server self-update and updater proxy removed); modified by us (`config.disabled`). | Accept the deletion. |
| `apps/api/src/router.ts`, `router.test.ts` | Our `updaterConfig` / `mapUpdaterError` helpers and the "Self-update is switched off" test sit where upstream removed the whole updater proxy. | Take upstream; drop our helpers and test. Remove the now-unused `brand` import if nothing else uses it. |
| `packages/brand` (`schema.ts`, `brand.json`, `schema.test.ts`) | Follow-on, not a git conflict: `updates.serverSelfUpdate` gated code that no longer exists. | Remove the flag so there is no dead switch. **Maintainer decision**: say so if you would rather keep the field. |
| `apps/desktop/package.json` | `productName` and `version`. | Keep `"productName": "Nurlings"`, take upstream `version` 0.3.3 (fewer future conflicts). |
| `apps/desktop/e2e/setup.spec.ts` | Import lines. | Keep our `brand` import with upstream's split type import. |
| `apps/mobile/app/_layout.tsx` | Upstream removed the `new` screen and the avatar-style provider wrapper (re-indent); ours still wraps in `AvatarStyleProvider` and registers `new`. | Take upstream's tree; keep our `brand.name` index title, and drop `AvatarStyleProvider` and `loadAvatarStyle` with their mobile files if upstream removed them, so nothing is left unreferenced. |
| `apps/web/src/App.tsx` | Upstream renders a blank session-pending frame; ours renders the brand intro animation. | Keep ours (brand animation, part of the rebrand). |
| `apps/web/src/pages/Auth.test.tsx` | Upstream: auth stays blank while capabilities load; ours: intro animation, tagline, "Loading…". | Keep our brand assertions, adopt upstream's "no form while loading" assertions. Decided while reading `Auth.tsx` after the merge. |
| `apps/web/vite.config.ts` | Both sides added an import. | Keep both (`brandPlugin`, `archiveAssets`). |
| `apps/worker/src/index.ts` | Our port of the worker health probe (`64beee1`) versus upstream's own, reworked health wiring. | Take upstream's; drop our port. Remove our `health.ts` duplicate if upstream's replaces it. |
| `packages/adapters/src/pi-models.ts` | Upstream reworded the self-hosted blurb ("server operator"); ours uses `brand.name`. | Upstream wording with `${brand.name}`. |
| `packages/adapters/src/pi-models.test.ts` | Our "never names the upstream product" test versus upstream's new "recommends one model per provider" test. | Keep both tests. |
| `packages/adapters/src/pi-runtime.ts` | Upstream added `restored?.systemPrompt ??`; ours builds the prompt from `brand.bot.singular`. | Upstream structure, our brand-aware prompt strings. |
| `packages/ui-web/src/bot-avatar.tsx` | Avatar-style imports removed upstream; ours keeps `BrandMark` for the brand logo. | Keep `BrandMark` and `brand` imports, drop the avatar-style imports, keep our wordmark rendering. |
| `apps/web/e2e/bot-crud.spec.ts` (5 hunks) | New create-bot dialog and collapsed settings sections. | Take upstream flows and selectors; wrap bot/brand wording in our `ui()` helper. |
| `apps/web/e2e/new-bot-ux.spec.ts` | Imports. | Upstream's `organicAvatarFamily` import plus our `ui` where still used. |
| `apps/web/e2e/readable-names.spec.ts` | Upstream accessibility-name selectors. | Upstream selectors with `ui("Bot")`. |
| `apps/web/e2e/fixtures/marketing-shots.tsx` | Fixture drives the new dialog. | Upstream fixture; `ui()` on the placeholder text. |

## Risks to review before the merge lands

1. **Postgres 16 to 18 (infra/compose only).** Upstream's compose files move to `postgres:18` with
   a new `postgres` volume and a guard that refuses to start on an old volume until
   `upgrade-postgres.sh` runs. Our Coolify stack (`deploy/coolify/docker-compose.yml`) is not
   touched by the merge and stays on Postgres 16 and `pgdata`, so production is unaffected. I
   propose **not** porting the Postgres upgrade to Coolify here; it is its own change with a
   backup and a maintenance window. Anyone using `infra/compose` after this merge gets the upstream
   behaviour.
2. **Database migrations (15 new, all dated 2026-10-23 and 2026-10-24).** Mostly new tables and
   columns (model credits, billing audit, thread read cursor, signup survey, object storage,
   cross-space bots, run dispatch timing). Items to look at: `billing_audit` drops two foreign keys
   on `usage_records` and revokes `UPDATE`/`DELETE`/`TRUNCATE` on it from the app role;
   `thread_read_cursor` and `credit_expiration_index` backfill with `UPDATE`;
   `run_dispatch_timing` backfills `runs` and drops a trigger; `credit_projection_indexes` drops an
   index created earlier in the same range; two migrations create indexes `CONCURRENTLY`. None
   renames or drops a column that the previous release reads, and no migration of ours exists to
   collide with them. Upstream owns the order-of-deploy guarantee, so the check is that Coolify
   runs migrations before the new API, which `deploy/coolify` already does.
3. **Environment variables.** Added, all optional: `OBJECT_STORAGE_*` (bot homes in S3), billing
   (`STRIPE_*` reshaped for model credits; billing stays off when unset). Removed:
   `RAKAZO_UPDATER_URL`, `RAKAZO_UPDATER_TOKEN`, and `RAKAZO_IMAGE_TAG` is no longer read by the
   API. Our Coolify compose still sets all three; harmless (ignored). Postgres pool and worker
   concurrency comments changed (Graphile needs at least 6 connections), so check the Coolify pool
   size is still at least 6.
4. **Compose and image changes picked up automatically in `infra/compose`.** New app and worker
   healthchecks (`dist/health-check.js`), a `webassets` volume for the previous builds' hashed web
   assets, a new `check-image` and `audit-ship` tooling, and a Dockerfile directory for the asset
   archive. The Coolify compose lacks the healthcheck and the `webassets` volume. Not required to
   run; I propose a **follow-up change** to mirror them rather than widening this sync.
5. **Dependencies.** `pnpm-lock.yaml` merges without conflict; I will regenerate nothing by hand
   and run `pnpm install --frozen-lockfile` to prove it still resolves.
6. **Not a release.** No tag is created or pushed; I will tell the maintainer when it is ready to
   release.

Contacts Rakazo-owned infrastructure: no.

## Impact

- Capabilities: `brand-config` and `external-links` (self-update flag and scenarios removed with the
  upstream feature), `user-facing-branding`, `ci-pipeline` and `coolify-deployment` (checked,
  expected unchanged).
- Large diff (about 926 files); most of it is upstream code that is already reviewed upstream.
- Adds 15 migrations that run on the next Coolify deploy.
