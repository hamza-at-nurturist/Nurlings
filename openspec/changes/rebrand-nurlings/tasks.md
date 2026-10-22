# Tasks

> Scope: customer-facing UI only (web, desktop, mobile). No API/server, prompts, User-Agent,
> self-update, Docker/installer/CI, `apps/www`, telemetry, README/docs, or internal identifiers.
> Native identifiers (bundle id, package, `rakazo://`, slug, desktop `appId`) are unchanged.
> Gate: do not start group 1 until the proposal is approved. One small commit per task or tight
> group. "Verify" is what proves a task done.

## 1. Brand package (foundation)

- [ ] 1.1 Create `packages/brand` (`@nurlings/brand`, no dependency on `@rakazo/*`) with `brand.json` (name, bot singular/plural, tagline "Powered by Nurturist AI", company, site URL, `null` for cloud/iOS/Android/community URLs, colours defaulting to today's values, asset paths, `updates: { desktop: false, mobileOta: false }`) and a typed, validated accessor. Verify: `pnpm --filter @nurlings/brand test` covers required fields, `null` optional URLs, and rejects a malformed config; `pnpm install` and `pnpm --filter @nurlings/brand check` pass.
- [ ] 1.2 Add the load-time rebrand helper (`brandMessages`): whole-word `Rakazo` → `brand.name`, English `bot`/`bots` → `Nurling`/`Nurlings` (capitalised brand noun), applied to strings and nested compiled-message arrays, preserving placeholders and possessives. Verify: unit tests with plural/select/rich-text shaped messages, `Rakazo's`, `Rakazo-Server`; `bot-123`, `botId`, `robot`, `chatbot`, `bottom` unchanged.
- [ ] 1.3 Add the `brand:check` skeleton and root script `pnpm brand:check` (checks `LICENSE` equals the upstream copy). Verify: passes now; fails when `LICENSE` is edited (temporary edit, reverted).

## 2. Placeholder assets

- [ ] 2.1 Create placeholder sources in `packages/brand/assets/`: `logo/nurlings-mark.png`, `logo/nurlings-wordmark.svg`, `app-icon/app-icon-1024.png`, `app-icon/Nurlings.icon/`, `android/{adaptive-foreground,adaptive-background,monochrome}-1024.png`, `android/notification-72.png`, `splash/splash-icon-1024.png`, `favicon/favicon-128.png` — neutral "N" tiles, no Rakazo mascot. Verify: `identify` shows the documented dimensions; contact-sheet visual check.
- [ ] 2.2 Repoint `packages/ui-tokens/scripts/export-brand.ts` at the brand assets (source image, `Nurlings.icon`), drop its `apps/www` outputs, run it, and regenerate web/desktop/mobile icon, favicon, splash and notification files. Verify: re-running gives no diff; `identify` on every generated file matches the sizes table; `git status` shows nothing changed under `apps/www`; no file in the three apps still derives from `orange-bot.png`.
- [ ] 2.3 Write `packages/brand/README.md` with the per-platform size table (from the proposal), the export command, and "do not hand-edit generated files". Verify: every file listed exists; the export command runs clean from a fresh checkout.

## 3. Web app

- [ ] 3.1 Apply the catalog seam in `apps/web/src/lib/i18n.ts`. Verify: a Vitest loads all 12 locales through the real loader and asserts no message contains the word "Rakazo"; a reviewed snapshot lists every message where the bot rule fires; `pnpm --filter @rakazo/web intl:extract` leaves `apps/web/src/locales` unchanged (`git diff --exit-code`).
- [ ] 3.2 Vite plugin (new file) that renders `index.html` (`<title>`, `apple-mobile-web-app-title`, theme colour) and emits `site.webmanifest` from the brand config; icons come from group 2. Verify: after `pnpm --filter @rakazo/web build`, `dist/index.html` and `dist/site.webmanifest` contain "Nurlings" and no "Rakazo".
- [ ] 3.3 Replace hardcoded web text and links: `Wordmark` in `packages/ui-web/src/bot-avatar.tsx`; `Auth`, `Welcome`, `McpOAuthCallback`, `HonchoSettingsForm`, `compatible-model-fields`, `connection-controls`; `SidebarFooter` (Docs → site; "Get the mobile app" hidden when store URLs are null); `packages/contracts` `AI_PRIVACY_URL` → site and `openai-compatible-ui.ts` text; add the "Powered by Nurturist AI" line to login and sidebar footer. Verify: component tests for each (including the hidden mobile-app entry and the tagline); `pnpm --filter @rakazo/web test` passes.
- [ ] 3.4 Update web tests that assert old names/URLs (`SidebarFooter.test.tsx`, Playwright specs such as `auth-lifecycle.spec.ts`) to read the brand config; storage-key assertions (`rakazo.composerDraft…`) stay. Verify: `pnpm --filter @rakazo/web test` passes; changed Playwright specs typecheck and run against the dev stack where available.

## 4. Mobile app

- [ ] 4.1 Apply the catalog seam in `apps/mobile/lib/i18n.ts`. Verify: a test loads every `lib/locales/*.ts` map through the loader and finds no "Rakazo" word; existing `i18n.test.ts` passes; the list of locales that keep a native-script word for "bot" is recorded in the test.
- [ ] 4.2 Overlay display identity in `apps/mobile/app.config.ts`: display `name`, all permission strings (camera, photos, microphone, speech, `NSLocalNetworkUsageDescription`), splash/theme colours, icons; disable OTA (`updates.enabled = false`, no `updates.url`); leave `app.json`, `slug`, `scheme`, `bundleIdentifier`, `package`, `owner` and `eas.projectId` untouched. Verify: a new test resolves the config and asserts the values, that OTA is off, and that identifiers equal `app.json`'s; `pnpm --filter @rakazo/mobile exec expo config --json` shows the same and no `u.expo.dev`.
- [ ] 4.3 Replace hardcoded mobile text/links: `sign-in.tsx`, `_layout.tsx` title, `endpoint.ts`, `(settings)/models.tsx`, `(settings)/ai-data-sharing.tsx`; `client-update.ts` no longer opens Rakazo's store/APK (inert when URLs are null). Update Maestro flow assertions ("Sign in to Nurlings"); flow `appId` and `rakazo://` links stay. Verify: `pnpm --filter @rakazo/mobile test` and `pnpm --filter @rakazo/mobile check` pass; flows pass a YAML lint (Maestro runs are device/CI-only and noted in the PR).

## 5. Desktop app

- [ ] 5.1 Setup window: template `setup.html` and read `setup.js` strings from the brand config; remove the hosted-cloud choice (`RAKAZO_CLOUD_URL`, `cloudUrl` plumbing) so the default selection is local/self-hosted; a profile that saved the hosted-cloud choice falls back to the setup screen. Verify: `setup-config` and setup unit tests updated and passing, including the saved-cloud fallback; `e2e/setup.spec.ts` updated (not run locally, per `AGENTS.md`).
- [ ] 5.2 Menus, dialogs and messages: `main.ts` (e.g. "Change … Server…", error strings), `local-stack.ts`, `browser-auth.ts`, `auto-update.ts` strings read the brand config; About panel configured via `app.setAboutPanelOptions` with name, version and "Powered by Nurturist AI". Verify: `pnpm --filter @rakazo/desktop test` passes with updated expectations; a unit test covers the About options.
- [ ] 5.3 Display identity: layered electron-builder config (first choice) or the guarded `package.json` lines supply `productName`, the macOS microphone text and the icon path (`Nurlings.icon`, `icon.ico`, `icon.png`); `appId`, `executableName`, `extraMetadata.name` unchanged. Verify: resolved builder config (`electron-builder --dir` config print or a config test) shows Nurlings and the unchanged identifiers; `brand:check` covers it.
- [ ] 5.4 Disable the auto-updater: set `DesktopUpdateController`'s `disabled` from `brand.updates.desktop === false`, and drop the `elie222/rakazo` `build.publish` block from the effective builder config. Verify: unit test that with defaults the updater module is never loaded and no network call is made; the in-app update UI shows no pending update; effective config contains no `elie222`.

## 6. Compliance

- [ ] 6.1 Add `NOTICE`: Nurlings is based on Rakazo by Elie Steinbock, licensed under Apache-2.0, link https://github.com/elie222/rakazo, published by Nurturist AI. `LICENSE` stays untouched. Verify: `brand:check` asserts the required phrases and that `git diff main -- LICENSE` is empty.

## 7. Guardrails and merge routine

- [ ] 7.1 Complete `brand:check`: all web/mobile locales rebranded (3.1, 4.1), resolved Expo config and builder config clean (4.2, 5.3), built `index.html`/manifest clean (3.2), no `elie222`/`u.expo.dev` in effective desktop/mobile runtime config (4.2, 5.4), `NOTICE` and `LICENSE` (6.1). Verify: passes on the branch and fails on a seeded leak in each category (temporary edits, reverted).
- [ ] 7.2 Wire `brand:check` into the root `test` script and CI, and document the upstream-merge routine in `packages/brand/README.md` (`git fetch upstream`, merge, `pnpm brand:check`, re-run `inventory.py`, review only new in-scope hits). Verify: CI config parses; a dry-run merge of current `upstream/main` into the branch reports no conflicts.

## 8. Final verification (integration only)

- [ ] 8.1 Clean install and static checks: `pnpm install`, `pnpm check`, `pnpm lint`. Verify: all exit 0.
- [ ] 8.2 Unit/integration tests: `pnpm test`. Failures caused by the rebrand are fixed; unrelated pre-existing failures are reported with their output, not hidden. Verify: exit 0, or documented upstream-baseline failures.
- [ ] 8.3 Start the web app and walk sign-in, onboarding, bot list, thread, settings, models, memory and usage with Playwright; assert `document.title` and visible text contain no "Rakazo"; save screenshots; list any server-supplied text that still says Rakazo (known residual, out of scope). Verify: automated assertion passes; residual list written to `remaining-rakazo.md`.
- [ ] 8.4 Final grep: `git grep -nIi rakazo` classified with `inventory.py`; every remaining occurrence is listed with its reason in `remaining-rakazo.md` and the PR. Verify: zero in-scope user-facing, identity or link occurrences remain outside `LICENSE`/`NOTICE`.
- [ ] 8.5 Check off every task in this file. Verify: `openspec validate rebrand-nurlings --strict` passes and `openspec status --change rebrand-nurlings` shows all tasks complete.

## Workflow follow-up

- Open the PR "Rebrand Rakazo to Nurlings (Powered by Nurturist AI)" with: summary, link to this OpenSpec change, what was intentionally left internal / out of scope, and manual steps (final artwork, Expo project for builds, store identifiers, signing identities, building and hosting images so clients receive this UI).
- After the PR is merged: run `openspec archive rebrand-nurlings` so the five capability specs move into `openspec/specs/`.
