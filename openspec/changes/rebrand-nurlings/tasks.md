# Tasks

> Gate: do not start group 1 until the proposal is approved. Open questions Q1–Q5 are in
> `design.md`; tasks assume the recommended answers and are adjusted if you decide otherwise.
> Conventions: one small commit per task or tight group; "Verify" is what proves it done.

## 1. Brand package (foundation)

- [ ] 1.1 Create `packages/brand` (`@nurlings/brand`, no dependencies on `@rakazo/*`) with `brand.json` (name, bot singular/plural, tagline, company, URLs with `null` for community/cloud/iOS/Android, native ids, colours defaulting to today's values, asset paths) and a typed, validated accessor. Verify: `pnpm --filter @nurlings/brand test` covers required fields, `null` optional URLs, and rejects a malformed config; `pnpm install` and `pnpm --filter @nurlings/brand check` pass.
- [ ] 1.2 Add the load-time rebrand helper (`brandMessages`) that rewrites whole-word `Rakazo` (and, per Q1, English `bot`/`bots`) in strings and nested compiled-message arrays, preserving placeholders and possessives. Verify: unit tests with plural/select/rich-text shaped messages and `Rakazo's`, `Rakazo-Server`, `bot-123` (unchanged), `botId` (unchanged).
- [ ] 1.3 Add the `brand:check` script/test skeleton (LICENSE hash equals upstream's, `NOTICE` exists) and the root script `pnpm brand:check`. Verify: it passes now and fails when `LICENSE` is edited (tested by a temporary edit).

## 2. Web app

- [ ] 2.1 Apply the catalog seam in `apps/web/src/lib/i18n.ts`. Verify: a Vitest loads all 12 locales through the real loader and asserts no message contains the word "Rakazo"; `pnpm --filter @rakazo/web intl:extract` leaves `.po` files unchanged (`git diff --exit-code apps/web/src/locales`).
- [ ] 2.2 Vite plugin that renders `index.html` (`<title>`, `apple-mobile-web-app-title`, theme colour) and emits `site.webmanifest` from the brand config. Verify: after `pnpm --filter @rakazo/web build`, `dist/index.html` and `dist/site.webmanifest` contain "Nurlings" and no "Rakazo".
- [ ] 2.3 Replace hardcoded web brand text and links: `Wordmark` in `packages/ui-web`, `SidebarFooter` (docs link → brand docs URL; "Get the mobile app" hidden when store URLs are null), "Powered by Nurturist AI" on login and footer, `McpOAuthCallback`/`Welcome`/`Auth` literals. Verify: component tests; `pnpm --filter @rakazo/web test` passes.
- [ ] 2.4 Update web unit tests and Playwright specs that assert old names/URLs (`auth-lifecycle.spec.ts` etc.) to read the brand config. Verify: `pnpm --filter @rakazo/web test` passes; changed Playwright specs run against the dev stack where available and otherwise typecheck.

## 3. Mobile app

- [ ] 3.1 Apply the catalog seam in `apps/mobile/lib/i18n.ts`. Verify: test loads every `lib/locales/*.ts` map through the loader and finds no "Rakazo" word; existing `i18n.test.ts` passes.
- [ ] 3.2 Overlay identity in `apps/mobile/app.config.ts` (name, slug, scheme, `bundleIdentifier`, `package`, permission strings incl. `NSLocalNetworkUsageDescription`, splash/theme colours; `owner`, `eas.projectId`, `updates.url` from env and absent when unset); leave `app.json` untouched. Verify: new test resolves the config with no env and asserts the values; `pnpm --filter @rakazo/mobile exec expo config --json` shows Nurlings and no `u.expo.dev`/`inbox-zero`.
- [ ] 3.3 Replace hardcoded mobile text/links (`client-update.ts` store URLs hidden when null, `endpoint.ts`/`models.tsx`/`ai-data-sharing.tsx` literals, `_layout.tsx` title) and update Maestro flows (`appId`, `rakazo://` links, "Sign in to …" assertions). Verify: `pnpm --filter @rakazo/mobile test` and `pnpm --filter @rakazo/mobile check` pass; flows are syntax-checked by YAML lint (Maestro runs are CI/device-only and noted in the PR).

## 4. Desktop app

- [ ] 4.1 Template `setup.html`/`setup.js` text from the brand config; hide the hosted-cloud option unless `urls.cloud` is set (default selection becomes local/self-hosted); rebrand `main.ts` menu/dialog strings and `auto-update.ts` messages. Verify: `pnpm --filter @rakazo/desktop test` (unit) passes with updated expectations; Playwright e2e specs updated but, per `AGENTS.md`, not run locally.
- [ ] 4.2 Electron identity: `productName`, `appId`, `executableName`, `appimage`/dmg names, icon path, macOS microphone text via the layered electron-builder config (first choice) or the guarded `package.json` lines. Verify: `pnpm --filter @rakazo/desktop exec electron-builder --dir --config <resolved>` (or a config-print test) shows Nurlings identity and no Rakazo.
- [ ] 4.3 T1: change `build.publish` to our repository and keep the updater inactive unless `brand.updates.desktop` is true. Verify: unit test that the updater is not initialised by default; resolved config contains no `elie222`.
- [ ] 4.4 T5: `RAKAZO_CLOUD_URL` and the setup "Rakazo Cloud" choice come from `brand.urls.cloud` (null by default); update `setup-config` tests and `e2e/setup.spec.ts`. Verify: `pnpm --filter @rakazo/desktop test` passes.

## 5. API, auth, core, adapters, contracts

- [ ] 5.1 `packages/auth`: `appName`, passkey `rpName`, all email subjects/bodies from the brand config. Verify: updated `packages/auth` tests assert Nurlings in every email and none of the upstream name.
- [ ] 5.2 `apps/api`: chat-channel messages (`messaging-inbound.ts`, `team-chat-bridge.ts`), accept both `nurlings://` and `rakazo://` app origins, `ANDROID_PACKAGE` from brand. Verify: `auth-origins.test.ts`, `app-association.test.ts` updated and passing for both schemes/packages.
- [ ] 5.3 `packages/adapters` and `packages/contracts`: `pi-models.ts`/`pi-oauth.ts` blurbs, `openai-compatible-ui.ts`, MCP OAuth `client_name`, the four User-Agent strings (T4, brand UA + site URL), model-identity sentences in `pi-runtime.ts`/`executor.ts` (Q5); keep `AUTOMATED_MESSAGE_LABEL` and the compaction prefix. Verify: adapter tests updated (`favicon.test.ts` UA match, prompt tests); `pnpm --filter @rakazo/adapters test` passes; a test proves a stored message with the persisted label is still recognised.
- [ ] 5.4 `packages/core` and `packages/contracts`: `self-update.ts`/`compose-update.ts` repo and image-repo constants driven by the brand config (T2; "no update source" when unconfigured), `secrets-guard.ts` text, `AI_PRIVACY_URL`, `IOS_APP_STORE_URL`/`ANDROID_APK_URL` nullable. Verify: `apps/api/src/server-update.test.ts` and core tests updated and passing; no `elie222` in non-doc runtime code (`git grep elie222 -- apps packages ':!*.md'` returns only intentional attribution).
- [ ] 5.5 T3/T8: remove Rakazo's Expo owner/EAS/OTA from effective config; retarget or disable CI jobs that point at Rakazo (`deploy-production` URL, `eas update` job) in `.github/workflows/ci.yml`. Verify: `actionlint` (or YAML parse) passes; the jobs are skipped without our secrets/vars.

## 6. Placeholder assets

- [ ] 6.1 Create placeholder sources in `packages/brand/assets/` (`logo/nurlings-mark.png`, `logo/nurlings-wordmark.svg`, `app-icon/app-icon-1024.png`, `app-icon/Nurlings.icon/`, `android/{adaptive-foreground,adaptive-background,monochrome}-1024.png`, `android/notification-72.png`, `splash/splash-icon-1024.png`, `favicon/favicon-128.png`, `social/og-image-1200x630.png`) — neutral "N" tiles, no Rakazo mascot. Verify: `identify` shows the documented dimensions; visual check of a contact sheet.
- [ ] 6.2 Repoint `packages/ui-tokens/scripts/export-brand.ts` (source path, output name) to the brand assets and run it; regenerate web/www/desktop/mobile outputs; remove `Rakazo.icon` and `orange-bot.png` from use. Verify: re-running yields no diff; `identify` on every generated file matches the sizes table; `git grep -il "orange-bot"` is empty.
- [ ] 6.3 `packages/brand/README.md`: full per-platform size table (from the proposal), the export command, "do not hand-edit generated files". Verify: every file listed exists; `pnpm --filter @nurlings/brand export:assets` runs clean.

## 7. Marketing site (`apps/www`)

- [ ] 7.1 Rebuild `src/site.ts`, `astro.config.mjs`, `vercel.json`, structured data, `ai-catalog.json`, `llms.txt` and page/component literals from the brand config; drop Discord, cloud/waitlist, upstream store and APK links. Verify: `pnpm --filter @rakazo/www build` succeeds; `git grep -i rakazo -- apps/www/dist` has no visible matches.
- [ ] 7.2 Q2: replace `privacy`/`terms`/`support` with placeholder pages without upstream operator text; unlist blog and comparison pages from nav, sitemap and `llms.txt`; remove Cloud/billing copy from visible pages. Verify: build output sitemap and nav contain none of them; visual check with Playwright screenshots of home, about, privacy, terms, support.
- [ ] 7.3 Regenerate OG images with the new mark (`render-og.mjs`) and update `www` unit tests (`github.test.ts`, `download.test.ts`, `middleware.test.ts`). Verify: `pnpm --filter @rakazo/www test` passes; OG files are 1200×630.

## 8. Docs, compliance, and repo metadata

- [ ] 8.1 Add `NOTICE` (based on Rakazo by Elie Steinbock, Apache-2.0, https://github.com/elie222/rakazo; published by Nurturist AI; upstream name/logo not used for branding). Verify: brand guard checks the required phrases; `LICENSE` hash unchanged.
- [ ] 8.2 Rewrite `README.md` for Nurlings (what it is, setup, stack, "Powered by Nurturist AI", link to https://nurlings.nurturistai.com, credit line to Rakazo near the bottom; no Discord/Railway/App Store/APK badges). Verify: guard test for README structure; all links resolve to allowed hosts.
- [ ] 8.3 Rebrand user-facing docs: `docs/*.md`, `SETUP_PROMPT.md`, `VISION.md`, `CONTRIBUTING.md`, `infra/railway/README.md`, `.github/ISSUE_TEMPLATE/*`, `SECURITY.md` (remove `*@rakazo.com` addresses; leave clearly marked placeholders for Nurturist AI contacts), `CHANGELOG.md` header (upstream history entries kept as attributed history). Installer/registry instructions are left pointing at the current registries with a note (rule 4). Verify: `git grep -n "rakazo.com\|discord" -- '*.md' .github` shows only allow-listed attribution lines.
- [ ] 8.4 Write the registry/installer prerequisites into `docs/nurlings-hosting-prerequisites.md` (images, installer URL, Railway template, release pipelines, accounts) and link it from the PR. Verify: every item in the proposal's Docker section is covered.

## 9. Guardrails and merge routine

- [ ] 9.1 Complete `brand:check`: catalogs rebranded, resolved Expo/Electron/Vite outputs clean, no upstream hosts in shipped runtime config (T1–T7), allow-list for NOTICE/README credit/LICENSE/internal tokens. Verify: passes on the branch; fails on a seeded leak in each category (temporary edits).
- [ ] 9.2 Wire `brand:check` into root `test` and CI; document the upstream-merge routine in `packages/brand/README.md` (`git fetch upstream`, merge, `pnpm brand:check`, re-run `inventory.py`, review new hits only). Verify: CI config lint/parse passes; a dry-run merge of current `upstream/main` into the branch is conflict-free.

## 10. Final verification (integration only)

- [ ] 10.1 Clean install and full static checks: `pnpm install`, `pnpm check` (typecheck), `pnpm lint`. Verify: all exit 0.
- [ ] 10.2 Unit/integration tests: `pnpm test` (Vitest). Failures caused by the rebrand are fixed; unrelated pre-existing failures are reported with output, not hidden. Verify: exit 0, or documented upstream-baseline failures.
- [ ] 10.3 Start the web app (`pnpm dev` stack, or built preview) and walk sign-in, onboarding, bot list, thread, settings, models, memory and usage with Playwright; assert page text and `document.title` contain no "Rakazo"; save screenshots. Verify: automated assertion passes; screenshots reviewed.
- [ ] 10.4 Final grep: `git grep -nIi rakazo` classified with `inventory.py`; every remaining occurrence is internal on purpose or an allowed attribution, listed with its reason in `remaining-rakazo.md` (and the PR). Verify: zero user-facing and zero external-link occurrences remain outside the allow-list.
- [ ] 10.5 Check off every task in this file. Verify: `openspec validate rebrand-nurlings --strict` passes and `openspec status --change rebrand-nurlings` shows all tasks complete.

## Workflow follow-up

- Open the PR "Rebrand Rakazo to Nurlings (Powered by Nurturist AI)" with: summary, link to this OpenSpec change, what was intentionally left internal, and manual steps (assets, domains, app store ids, signing identities, image/installer hosting, contact emails, legal pages).
- After the PR is merged: run `openspec archive rebrand-nurlings` so the five capability specs move into `openspec/specs/`.
