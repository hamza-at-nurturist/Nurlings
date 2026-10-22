# Proposal: Rebrand Rakazo to Nurlings (Powered by Nurturist AI)

## Why

This repository is a private mirror of Rakazo (Apache-2.0). We are shipping it as our own product,
**Nurlings** by **Nurturist AI**, so every place a person sees, installs, or opens the product must
say Nurlings, not Rakazo. We also keep pulling upstream Rakazo updates, so the rebrand has to be a
thin layer on top of upstream, not a rewrite of it: renaming internals would create conflicts in
thousands of lines for zero user benefit.

## What Changes

- **Central brand config** (new package `packages/brand`): name, bot singular/plural ("Nurling" /
  "Nurlings"), tagline ("Powered by Nurturist AI"), company, URLs, colours, logo paths. Product
  code reads it instead of hardcoding "Nurlings".
- **User-facing text → Nurlings**, across web, Electron, Expo, API-sent emails/messages and the
  marketing site, through the brand config. Upstream's translated UI strings (Lingui catalogs on
  web, locale maps on mobile) are rebranded at **one load-time seam per platform** instead of
  editing every string in 12 locales, so future upstream strings are rebranded automatically.
- **App identity → Nurlings**: Electron `productName`/`appId`, Expo `name`/`slug`/`scheme`/
  `bundleIdentifier`/`package`, web `<title>` and manifests, window titles, permission prompts.
  Icons, favicons and splash are replaced by clearly named **placeholders** in one assets folder.
- **External links**: links to Rakazo's site → https://nurlings.nurturistai.com; Discord, Rakazo's
  GitHub, Rakazo Cloud / waitlist, Rakazo's App Store and APK links are **removed** (no replacement
  support link). Anything that contacts Rakazo-owned infrastructure is **disabled** (see Flags).
- **License compliance**: `LICENSE` untouched; new `NOTICE` crediting Rakazo by Elie Steinbock
  (Apache-2.0, link to the original repo); Rakazo name/logo not used in our branding.
- **README rewritten** for Nurlings, "Powered by Nurturist AI", link to
  https://nurlings.nurturistai.com, short credit line to Rakazo near the bottom.
- **Guardrails**: a `brand:check` script/test that fails if "Rakazo" appears in user-visible output,
  so upstream merges cannot silently reintroduce the old name.

**Not BREAKING for users of this fork** (nothing is deployed). It *is* a one-way door for native
identifiers: changing the iOS bundle id / Android package / URL scheme later means a new app
listing, so the proposed values (`com.nurturistai.nurlings`, scheme `nurlings`) need your OK.

## Capabilities

### New Capabilities
- `brand-config`: the single source of truth for brand values, and how each surface consumes it.
- `user-facing-branding`: all text people read (UI, titles, emails, onboarding, errors, docs shown
  to users, bot-visible product name) says Nurlings / Nurling(s).
- `app-identity`: installable app identity (Electron, Expo, web manifest/title) and the placeholder
  asset set with documented sizes.
- `external-links`: where product links point, which Rakazo links are removed, and that nothing
  contacts Rakazo-owned infrastructure (analytics, update feeds, OTA, registries).
- `license-attribution`: Apache-2.0 compliance — LICENSE, NOTICE, README credit, no Rakazo marks.

### Modified Capabilities
None — `openspec/specs/` is empty; these specs are created by archiving this change.

## Impact

- **Code**: ~190 files carry user-facing text, ~15 carry app identity, ~75 carry Rakazo links
  (full inventory below). Edits to upstream files are small and mechanical; new code is additive
  (`packages/brand`, a catalog-substitution helper, brand check, NOTICE, assets).
- **Tests**: tests that assert the old name/URLs/UA (≈70 files, mostly `*.test.ts`, Playwright
  specs, Maestro flows) are updated to read the brand config.
- **Build/CI**: static identity files (desktop `package.json` build block, mobile `app.json`,
  `index.html`, manifests) are generated or overridden from the brand config and verified in CI.
- **Upstream merges**: expected conflict surface is limited to the small edited hunks; internal
  names are untouched so the other ~1,500 files with internal `rakazo` tokens merge cleanly.
- **Out of scope**: renaming `@rakazo/*`, `RAKAZO_*`, DB/Docker names; building/hosting our own
  images and app-store listings (flagged below); writing new legal text.

## What stays internal on purpose

Kept as-is to preserve mergeability (7,346 of 8,696 occurrences, 84%) — see Appendix A:

| Kept | Why |
|---|---|
| `@rakazo/*` package names (≈2,300 references) and the root `package.json` name | Workspace identity; renaming rewrites every import and the lockfile |
| `RAKAZO_*` env vars, `x-rakazo-*` headers, `/.well-known/rakazo-desktop-stack`, `isRakazoHealth` | Wire/config contract between our own components; invisible to users |
| `rakazo` Postgres DB/role names, compose service names, `rakazo/computer` image names, `/home/rakazo`, systemd units, `rakazo-*` scripts | Operational names; changing them breaks existing deploys and the installer |
| Browser storage keys (`rakazo.*`, `rakazo:*`), data attributes, native module names (`RakazoNotifications`, `com.rakazo.notifications`), TS identifiers (`RakazoDesktop`) | Code identifiers; renaming discards users' local state and churns native code |
| Persisted/protocol markers (`AUTOMATED_MESSAGE_LABEL`, reserved peer id `rakazo-shared`) | Stored data is matched against them; the *free-text* sentences around them are rebranded |
| Code comments, test fixture hosts (`rakazo.example.com`, `rakazo.test`) | Not user-visible |

Rule of thumb used throughout: **if a person can read or click it, it is branded; if only code
can, it stays.**

## Flags — things that contact Rakazo-owned infrastructure or that you must decide

### Telemetry / analytics (rule 3)

Result of the scan: **no analytics or error reporting is hardcoded to Rakazo.** PostHog
(`ANALYTICS_*`, `PUBLIC_POSTHOG_KEY`), Sentry (`SENTRY_DSN`, `SENTRY_BROWSER_DSN`) and Axiom
(`AXIOM_*`) are all opt-in via env vars that are empty by default; no key or DSN is committed. The
defaults point at the vendors (`us.i.posthog.com`), not at Rakazo. We will keep them off and document
that they need our own project keys. **Not telemetry, but equivalent phone-home paths to Rakazo that
we will disable or re-point:**

| # | What | Where | Effect today | Plan |
|---|---|---|---|---|
| T1 | Desktop auto-update feed | `apps/desktop/package.json` `build.publish` → GitHub `elie222/rakazo` | A Nurlings desktop build would check Rakazo's releases and could **install Rakazo's build over ours** | Re-point to our repo and gate the updater off until we publish signed releases |
| T2 | Server self-update | `OFFICIAL_REPO_URL`, `PUBLISHED_IMAGE_REPO` (`packages/core`) | "Update" in a Nurlings server would pull Rakazo's code/images and undo the rebrand | Drive from brand config (our repo/registry); needs your decision — D4 |
| T3 | Mobile OTA + EAS project | `apps/mobile/app.json` `owner: inbox-zero`, EAS `projectId`, `updates.url` → `u.expo.dev/…` | Builds would be tied to Rakazo's Expo account/OTA channel; CI `eas update` job targets it | Move to env-provided owner/projectId (blank until you create ours); OTA off until set |
| T4 | Outbound User-Agent | `Rakazo/0.1 (+https://github.com/elie222/rakazo; web tools)` in 4 adapters | Every site a bot fetches is told it is "Rakazo" and sent to Rakazo's GitHub | Brand-config driven UA (`Nurlings/…`, our URL) |
| T5 | Hosted "Rakazo Cloud" origin | `RAKAZO_CLOUD_URL = https://app.rakazo.com` + desktop setup choice | New desktop users are offered to sign in to **Rakazo's hosted service** | Hidden unless the brand config defines a cloud URL (it will not) |
| T6 | Store/APK links | `IOS_APP_STORE_URL`, `ANDROID_APK_URL` (contracts) | "Get the mobile app" and force-update prompts send users to **Rakazo's apps** | Brand config; link hidden until our listings exist |
| T7 | Privacy URL | `AI_PRIVACY_URL = https://rakazo.com/privacy/` | AI-consent screens link to Rakazo's privacy policy | Brand config → our site (needs our own policy page, see below) |
| T8 | Production deploy job | `.github/workflows/ci.yml` `deploy-production` (`app.rakazo.com`), `eas update` job | Gated on `vars.PRODUCTION_DEPLOY_ENABLED` / `EXPO_TOKEN`; inert without secrets but wrong target | Retarget/disable in our fork |
| T9 | OpenSpec itself | CLI collects anonymous usage stats | n/a to product | Disabled for our runs (`OPENSPEC_TELEMETRY=0`); optional to set in repo docs |

### Docker / install script (rule 4) — registries are NOT changed in this change

The installer, the compose files, the desktop app's embedded stack, and server self-update all pull
Rakazo's published images. **Until we build and host our own, anyone using the installer or the
desktop "local stack" runs Rakazo-built containers whose web UI still says Rakazo.** To go live we
need to build and host:

1. **Server images** `app`, `computer`, `updater` — upstream publishes them with
   `.github/workflows/publish-server-image.yml` to `ghcr.io/${{ github.repository }}/<name>`; run
   in our repo that becomes `ghcr.io/hamza-at-nurturist/nurlings/{app,computer,updater}`
   automatically. Packages from a **private** repo are private, so pulls need `docker login` or the
   packages must be made public — decide before telling customers to "curl | sh".
2. **Image reference defaults** to point at our registry: `RAKAZO_IMAGE` /
   `RAKAZO_UPDATER_IMAGE` defaults in `infra/compose/*.yml` (14 refs to `ghcr.io/elie222/rakazo/*`),
   `PUBLISHED_IMAGE_REPO` in `packages/core/src/compose-update.ts`, and the `docs/self-host.md`
   image table. (Env var *names* stay `RAKAZO_*`.)
3. **A hosted installer URL**: `infra/compose/install-images.sh` downloads from
   `raw.githubusercontent.com/elie222/rakazo/main/...` (`RAKAZO_DOWNLOAD_BASE`); raw URLs don't work
   for a private repo — we need e.g. `https://nurlings.nurturistai.com/install.sh` or a public
   bucket, and README / `SETUP_PROMPT.md` pointed at it.
4. **Railway template**: `railway.com/new/template/rakazo-template` is Rakazo's template; we need
   to publish our own (README and `infra/railway/README.md` link to it). Removed from README until
   then.
5. **Desktop/mobile release pipelines**: `release-desktop.yml` (macOS notarization + Windows
   signing secrets), `release-android-apk.yml`, EAS builds — all need our certificates, Apple
   Team/App Store Connect and Play Console accounts, and an `EXPO_TOKEN`.
6. **Sandbox/computer image** (`rakazo/computer`) keeps its internal name but must be built and
   hosted by us for bots' computers.

### Marketing site and legal pages (`apps/www`)

`apps/www` is Rakazo's marketing site: name/URLs come through `apps/www/src/site.ts` (easy), but it
also carries Rakazo-specific **claims** (comparison pages vs. other products, blog posts, "Rakazo
Cloud is in beta", subscription/billing FAQ, `hello@rakazo.com`) and **legal text**:
`privacy.astro` and `terms.astro` are written for Rakazo's service and operator. We can change the
name but must not publish them as Nurturist AI's policy without legal review. See open question Q2.

## Placeholder assets and the sizes each platform needs

Placeholders live in **one folder**, `packages/brand/assets/`, with names that say what they are;
`pnpm --filter @nurlings/brand export:assets` writes the per-platform sizes below into each app
(adapting upstream's `export-brand.ts`, which already generates everything from one source image).
Drop real artwork over the files marked **source**; do not hand-edit the generated ones.

| Surface | File(s) the app uses | Size / format | Source asset |
|---|---|---|---|
| macOS (Electron) | `Nurlings.icon` bundle (Icon Composer, compiled by electron-builder, needs Xcode 26+) | 1024×1024 PNG layer | `app-icon/Nurlings.icon` |
| Windows (Electron) | `icon.ico` | frames 16, 32, 48, 64, 128, 256 | `app-icon/app-icon-1024.png` |
| Linux (Electron) | `icon.png` | 1024×1024 (≥512 required) | `app-icon/app-icon-1024.png` |
| iOS | `Nurlings.icon` bundle (Expo `ios.icon`); App Store icon | 1024×1024, **no alpha** for the store copy | `app-icon/Nurlings.icon` |
| Android launcher | `icon.png`; adaptive `foreground`, `background`, `monochrome` | 1024×1024 each; adaptive art inside the central 66% safe zone | `android/*` |
| Android notification | `notification-icon.png` + native vector `ic_*_notification.xml` | 72×72 white-on-alpha silhouette (24dp vector) | `android/notification-72.png` |
| Android store | Play hi-res icon / feature graphic (manual upload) | 512×512 / 1024×500 | `app-icon`, `social` |
| Mobile splash | `splash-icon.png` (+ bg `#FCFCFC` light / `#141414` dark from brand colours) | 1024×1024 transparent, art ≈620px centred | `splash/splash-icon-1024.png` |
| Mobile web | `favicon.png` | 128×128 | `favicon/favicon-128.png` |
| Web app (`apps/web/public`) | `favicon.ico` (16,32,48), `favicon-16x16`, `favicon-32x32`, `favicon.png` 128, `apple-touch-icon` 180, `icon-192`, `icon-512`, `site.webmanifest` icons | as listed | `app-icon/app-icon-1024.png` |
| Marketing site (`apps/www/public`) | same web set + `brand/<mark>.png` 256×256, `og-image.png` 1200×630, 13 per-page `og/*.png` 1200×630 (regenerated by `render-og.mjs`) | as listed | `logo/nurlings-mark.png`, `social/og-image-1200x630.png` |
| In-app wordmark | `Wordmark` component in `packages/ui-web` (CSS face + name today) | SVG/CSS; reads brand name | `logo/nurlings-wordmark.svg` |

Apple Team ID, bundle ids registered in App Store Connect / Play Console, provisioning and signing
certificates are **manual** and listed again in the PR.

## Open questions (details and recommendations in `design.md`)

1. **Q1 — "bot" → "Nurling(s)" in UI copy.** Rebrand the *product* name everywhere; additionally
   rewrite the English word "bot(s)" in UI copy (54 web message IDs, ≈75 mobile strings)? *Recommend
   yes, via the same load-time seam, English-script words only.*
2. **Q2 — `apps/www` scope.** Rebrand name/URLs only (recommended), or also remove Rakazo-specific
   comparison/blog/legal/Cloud/billing content? *Recommend: rebrand name/URLs now; replace
   privacy/terms/support with placeholders pending our own text; leave blog/comparison pages in the
   repo but unlinked, unlisted in sitemap, until rewritten.*
3. **Q3 — Native identifiers.** `com.nurturistai.nurlings` (iOS bundle id, Android package,
   Electron appId), scheme `nurlings`. The API must keep accepting `rakazo://` as well so
   upstream-built clients keep working. *Recommend as proposed.*
4. **Q4 — Self-update target (T2).** Point `OFFICIAL_REPO_URL`/image repo at
   `hamza-at-nurturist/Nurlings` (needs credentials while the repo is private), or disable
   in-product server updates until we publish? *Recommend: brand-config driven, default to our repo.*
5. **Q5 — LLM-facing text.** Rebrand free-text prompt sentences that name the product (a bot could
   repeat them to users), keep persisted markers? *Recommend yes: ≈5 identity sentences in 2 files (`pi-runtime.ts`, `executor.ts`); the persisted `AUTOMATED_MESSAGE_LABEL` and the `Rakazo-owned compacted context…` prefix (matched by `startsWith` on stored messages) stay.*

Gate: **implementation does not start until you approve this proposal.**

---

# Appendix A — Occurrence inventory ("rakazo", case-insensitive)

Generated from `git grep -nIi rakazo` on `main` (= upstream `46eeb1c2`), classified by
`inventory.py` in this change folder (re-runnable; also used for the final "what remains" check).
Classification is rule-based (path + context + token shape), so a handful of lines may be filed one
group off; the final grep pass re-checks every remaining occurrence by hand. **Line-level**
listings for the three groups that change are in [`inventory-lines.md`](./inventory-lines.md)
(locale catalogs list the English file only — the 11 other locales repeat the same message IDs).
Internal occurrences are summarised per area with their top tokens, not per line (7,346 lines).


Total occurrences in tracked text files: **8696**

| Group | Occurrences | Files |
|---|---:|---:|
| user-facing | 990 | 188 |
| app-identity | 46 | 15 |
| external-links | 314 | 74 |
| internal | 7346 | 1496 |

## User-facing (UI text, titles, emails, onboarding, errors, docs shown to users)

### apps/www — 381 hits in 41 files

- `apps/www/src/alternatives.ts` (68)
- `apps/www/src/guide.ts` (44)
- `apps/www/src/agent-content.ts` (27)
- `apps/www/src/content/blog/openclaw-vs-hermes-vs-rakazo.md` (27)
- `apps/www/src/grok-alternative.ts` (25)
- `apps/www/src/roundup.ts` (21)
- `apps/www/src/content/blog/best-open-source-ai-agents-2026.md` (20)
- `apps/www/src/content/blog/self-host-an-ai-agent.md` (20)
- `apps/www/src/i18n/home.ts` (20)
- `apps/www/src/pages/openclaw-alternative.astro` (19)
- `apps/www/src/pages/privacy.astro` (13)
- `apps/www/src/pages/self-hosted-ai-agent.astro` (10)
- `apps/www/src/pages/support.astro` (8)
- `apps/www/src/pages/terms.astro` (8)
- `apps/www/src/pages/about.astro` (7)
- `apps/www/src/pages/grok-bot-alternative.astro` (4)
- `apps/www/public/.well-known/ai-catalog.json` (3)
- `apps/www/src/pages/blog/[slug].astro` (3)
- `apps/www/public/graphics/architecture.svg` (2)
- `apps/www/public/graphics/setup-steps.svg` (2)
- `apps/www/src/components/AlternativeCompare.astro` (2)
- `apps/www/src/components/ArchitectureDiagram.astro` (2)
- `apps/www/src/components/SetupSteps.astro` (2)
- `apps/www/src/components/VsCard.astro` (2)
- `apps/www/src/layouts/BaseLayout.astro` (2)
- `apps/www/src/pages/404.astro` (2)
- `apps/www/src/pages/blog/index.astro` (2)
- `apps/www/src/site.ts` (2)
- `apps/www/src/vs-points.ts` (2)
- `apps/www/public/avatars/bot-avatar-blue.svg` (1)
- `apps/www/public/avatars/bot-avatar-coral.svg` (1)
- `apps/www/public/avatars/bot-avatar-indigo.svg` (1)
- `apps/www/public/avatars/bot-avatar-orange.svg` (1)
- `apps/www/public/avatars/bot-avatar-pink.svg` (1)
- `apps/www/public/avatars/bot-avatar-teal.svg` (1)
- `apps/www/public/avatars/bot-avatar-violet.svg` (1)
- `apps/www/scripts/render-og.mjs` (1)
- `apps/www/src/components/HomePage.astro` (1)
- `apps/www/src/components/Logo.astro` (1)
- `apps/www/src/og-pages.ts` (1)
- `apps/www/src/subscription-faq.ts` (1)

### apps/web — 229 hits in 25 files

- `apps/web/src/locales/en/messages.po` (14)
- `apps/web/src/locales/nl/messages.po` (14)
- `apps/web/src/locales/de/messages.po` (13)
- `apps/web/src/locales/es/messages.po` (13)
- `apps/web/src/locales/fr/messages.po` (13)
- `apps/web/src/locales/he/messages.po` (13)
- `apps/web/src/locales/hi/messages.po` (13)
- `apps/web/src/locales/pt-BR/messages.po` (13)
- `apps/web/src/locales/ru/messages.po` (13)
- `apps/web/src/locales/tr/messages.po` (13)
- `apps/web/src/locales/zh-CN/messages.po` (13)
- `apps/web/scripts/translations-de.json` (10)
- `apps/web/scripts/translations-es.json` (10)
- `apps/web/scripts/translations-hi.json` (10)
- `apps/web/scripts/translations-pt-BR.json` (10)
- `apps/web/scripts/translations-tr.json` (10)
- `apps/web/scripts/translations-zh-CN.json` (10)
- `apps/web/src/locales/ko/messages.po` (9)
- `apps/web/scripts/translations-ko.json` (7)
- `apps/web/src/pages/Auth.tsx` (2)
- `apps/web/src/pages/memory-providers/HonchoSettingsForm.tsx` (2)
- `apps/web/src/pages/McpOAuthCallback.tsx` (1)
- `apps/web/src/pages/Welcome.tsx` (1)
- `apps/web/src/pages/model-settings/compatible-model-fields.tsx` (1)
- `apps/web/src/pages/model-settings/connection-controls.tsx` (1)

### apps/mobile — 69 hits in 10 files

- `apps/mobile/lib/locales/ru.ts` (14)
- `apps/mobile/lib/locales/zh.ts` (14)
- `apps/mobile/lib/locales/de.ts` (12)
- `apps/mobile/lib/locales/nl.ts` (12)
- `apps/mobile/app.json` (10)
- `apps/mobile/app/sign-in.tsx` (2)
- `apps/mobile/lib/endpoint.ts` (2)
- `apps/mobile/app/(settings)/ai-data-sharing.tsx` (1)
- `apps/mobile/app/(settings)/models.tsx` (1)
- `apps/mobile/app/_layout.tsx` (1)

### apps/mobile (tests) — 39 hits in 12 files

- `apps/mobile/lib/i18n.test.ts` (8)
- `apps/mobile/.maestro/keyboard-lifecycle.yaml` (4)
- `apps/mobile/.maestro/screenshots.yaml` (4)
- `apps/mobile/e2e/ios-screenshots/flows/auth.yaml` (4)
- `apps/mobile/e2e/ios-screenshots/subflows/launch-app.yaml` (4)
- `apps/mobile/.maestro/smoke.yaml` (3)
- `apps/mobile/.maestro/split-view.yaml` (3)
- `apps/mobile/.maestro/notification-demo.yaml` (2)
- `apps/mobile/e2e/README.md` (2)
- `apps/mobile/e2e/ios-screenshots/subflows/sign-in.yaml` (2)
- `apps/mobile/lib/endpoint.test.ts` (2)
- `apps/mobile/e2e/ios-screenshots/README.md` (1)

### apps/desktop (tests) — 30 hits in 6 files

- `apps/desktop/e2e/setup.spec.ts` (19)
- `apps/desktop/e2e/local-stack.spec.ts` (4)
- `apps/desktop/src/setup-config.test.ts` (3)
- `apps/desktop/e2e/smoke.spec.ts` (2)
- `apps/desktop/e2e/window-drag.spec.ts` (1)
- `apps/desktop/src/package-metadata.test.ts` (1)

### docs/self-host.md — 25 hits in 1 files

- `docs/self-host.md` (25)

### packages/adapters — 23 hits in 12 files

- `packages/adapters/src/pi-models.ts` (5)
- `packages/adapters/src/pi-runtime.ts` (4)
- `packages/adapters/src/pi-oauth.ts` (3)
- `packages/adapters/src/composio-fake.ts` (2)
- `packages/adapters/src/history-compaction.ts` (2)
- `packages/adapters/src/automated-messages.ts` (1)
- `packages/adapters/src/executor.ts` (1)
- `packages/adapters/src/honcho-memory-provider.ts` (1)
- `packages/adapters/src/mcp-oauth.ts` (1)
- `packages/adapters/src/mcp-transport.ts` (1)
- `packages/adapters/src/runtime-context.ts` (1)
- `packages/adapters/src/scripted-runtime.ts` (1)

### packages/adapters (tests) — 20 hits in 13 files

- `packages/adapters/src/composio-connector.test.ts` (2)
- `packages/adapters/src/desktop-sandbox-paths.test.ts` (2)
- `packages/adapters/src/mcp-transport.test.ts` (2)
- `packages/adapters/src/pi-models.test.ts` (2)
- `packages/adapters/src/pi-runtime-helper-framing.test.ts` (2)
- `packages/adapters/src/runtime-context.test.ts` (2)
- `packages/adapters/src/smtp-email.test.ts` (2)
- `packages/adapters/src/automated-messages.test.ts` (1)
- `packages/adapters/src/e2b-sandbox.test.ts` (1)
- `packages/adapters/src/e2b-template.test.ts` (1)
- `packages/adapters/src/favicon.test.ts` (1)
- `packages/adapters/src/history-compaction.test.ts` (1)
- `packages/adapters/src/mcp-oauth.test.ts` (1)

### packages/testkit (tests) — 19 hits in 7 files

- `packages/testkit/src/backup-scripts.test.ts` (8)
- `packages/testkit/src/playwright-report-dashboard.ts` (4)
- `packages/testkit/src/cli/desktop-performance.ts` (2)
- `packages/testkit/src/executor-lifecycle.test.ts` (2)
- `packages/testkit/src/computer-use.e2e.test.ts` (1)
- `packages/testkit/src/ios-screenshot-gallery.ts` (1)
- `packages/testkit/src/parallel-web.test.ts` (1)

### apps/desktop — 15 hits in 6 files

- `apps/desktop/src/setup.js` (5)
- `apps/desktop/src/main.ts` (4)
- `apps/desktop/src/browser-auth.ts` (2)
- `apps/desktop/src/local-stack.ts` (2)
- `apps/desktop/package.json` (1)
- `apps/desktop/src/auto-update.ts` (1)

### README.md — 14 hits in 1 files

- `README.md` (14)

### packages/auth — 14 hits in 2 files

- `packages/auth/src/index.ts` (11)
- `packages/auth/src/account-security.ts` (3)

### apps/web (tests) — 13 hits in 7 files

- `apps/web/e2e/auth-lifecycle.spec.ts` (6)
- `apps/web/e2e/fixtures/marketing-shots.tsx` (2)
- `apps/web/e2e/helpers.ts` (1)
- `apps/web/e2e/model-settings.spec.ts` (1)
- `apps/web/e2e/settings-shell.spec.ts` (1)
- `apps/web/src/novnc-html.test.ts` (1)
- `apps/web/src/pages/ModelSettingsOverlay.test.tsx` (1)

### infra/compose — 12 hits in 5 files

- `infra/compose/install-images.sh` (4)
- `infra/compose/install-images-pull-never.smoke.sh` (3)
- `infra/compose/backup-prod.sh` (2)
- `infra/compose/host-alert.py` (2)
- `infra/compose/restrict-computer-egress.sh` (1)

### docs/computer-runtime.md — 9 hits in 1 files

- `docs/computer-runtime.md` (9)

### infra/railway — 9 hits in 1 files

- `infra/railway/README.md` (9)

### SETUP_PROMPT.md — 7 hits in 1 files

- `SETUP_PROMPT.md` (7)

### apps/api — 7 hits in 2 files

- `apps/api/src/team-chat-bridge.ts` (5)
- `apps/api/src/messaging-inbound.ts` (2)

### .github/ISSUE_TEMPLATE — 5 hits in 3 files

- `.github/ISSUE_TEMPLATE/bug.yml` (2)
- `.github/ISSUE_TEMPLATE/self-host.yml` (2)
- `.github/ISSUE_TEMPLATE/config.yml` (1)

### VISION.md — 5 hits in 1 files

- `VISION.md` (5)

### infra/sandboxes — 5 hits in 4 files

- `infra/sandboxes/computer/rakazo-browser.desktop` (2)
- `infra/sandboxes/computer/control.py` (1)
- `infra/sandboxes/computer/embed.html` (1)
- `infra/sandboxes/computer/fluxbox.menu` (1)

### packages/auth (tests) — 5 hits in 2 files

- `packages/auth/src/identity-trust.test.ts` (3)
- `packages/auth/src/index.test.ts` (2)

### apps/www (tests) — 4 hits in 2 files

- `apps/www/src/agent-content.test.ts` (3)
- `apps/www/src/middleware.test.ts` (1)

### packages/core — 4 hits in 3 files

- `packages/core/src/self-update.ts` (2)
- `packages/core/src/node/terminal-server.ts` (1)
- `packages/core/src/secrets-guard.ts` (1)

### .github/workflows — 3 hits in 3 files

- `.github/workflows/desktop-macos-screenshot.yml` (1)
- `.github/workflows/release-android-apk.yml` (1)
- `.github/workflows/release-desktop.yml` (1)

### CHANGELOG.md — 3 hits in 1 files

- `CHANGELOG.md` (3)

### docs/mobile-release.md — 3 hits in 1 files

- `docs/mobile-release.md` (3)

### CONTRIBUTING.md — 2 hits in 1 files

- `CONTRIBUTING.md` (2)

### apps/api (tests) — 2 hits in 1 files

- `apps/api/src/env.test.ts` (2)

### docs/agent-verification.md — 2 hits in 1 files

- `docs/agent-verification.md` (2)

### infra/systemd — 2 hits in 2 files

- `infra/systemd/rakazo-backup.service` (1)
- `infra/systemd/rakazo-backup.timer` (1)

### AGENTS.md — 1 hits in 1 files

- `AGENTS.md` (1)

### LICENSE — 1 hits in 1 files

- `LICENSE` (1)

### SECURITY.md — 1 hits in 1 files

- `SECURITY.md` (1)

### docs/ai-data-sharing-review.md — 1 hits in 1 files

- `docs/ai-data-sharing-review.md` (1)

### docs/content-encryption.md — 1 hits in 1 files

- `docs/content-encryption.md` (1)

### docs/context-and-evals-tasks.md — 1 hits in 1 files

- `docs/context-and-evals-tasks.md` (1)

### docs/performance.md — 1 hits in 1 files

- `docs/performance.md` (1)

### infra/compose (tests) — 1 hits in 1 files

- `infra/compose/host-safeguards.test.py` (1)

### packages/contracts — 1 hits in 1 files

- `packages/contracts/src/openai-compatible-ui.ts` (1)

### packages/ui-web — 1 hits in 1 files

- `packages/ui-web/src/bot-avatar.tsx` (1)


## App identity (Electron/Expo identifiers, icons, splash, favicons, manifests)

### apps/desktop — 13 hits in 3 files

- `apps/desktop/package.json` (7)
- `apps/desktop/src/setup.html` (5)
- `apps/desktop/assets/README.md` (1)

### apps/www (tests) — 8 hits in 2 files

- `apps/www/src/github.test.ts` (7)
- `apps/www/src/download.test.ts` (1)

### .github/workflows — 6 hits in 2 files

- `.github/workflows/desktop-macos-screenshot.yml` (4)
- `.github/workflows/release-desktop.yml` (2)

### apps/mobile — 6 hits in 1 files

- `apps/mobile/app.json` (6)

### apps/web — 4 hits in 2 files

- `apps/web/index.html` (2)
- `apps/web/public/site.webmanifest` (2)

### packages/ui-tokens — 3 hits in 2 files

- `packages/ui-tokens/scripts/export-brand.ts` (2)
- `packages/ui-tokens/assets/README.md` (1)

### README.md — 2 hits in 1 files

- `README.md` (2)

### apps/www — 2 hits in 1 files

- `apps/www/public/site.webmanifest` (2)

### packages/testkit (tests) — 2 hits in 1 files

- `packages/testkit/src/cli/desktop-performance.ts` (2)


## External links (rakazo.com, GitHub, Discord, Cloud/waitlist, registries, UA, telemetry targets)

### apps/www — 120 hits in 17 files

- `apps/www/src/agent-content.ts` (63)
- `apps/www/src/site.ts` (13)
- `apps/www/public/.well-known/ai-catalog.json` (9)
- `apps/www/src/content/blog/self-host-an-ai-agent.md` (7)
- `apps/www/src/pages/terms.astro` (5)
- `apps/www/vercel.json` (4)
- `apps/www/src/guide.ts` (3)
- `apps/www/src/pages/privacy.astro` (3)
- `apps/www/middleware.ts` (2)
- `apps/www/src/pages/about.astro` (2)
- `apps/www/src/pages/support.astro` (2)
- `apps/www/src/structured-data.ts` (2)
- `apps/www/astro.config.mjs` (1)
- `apps/www/src/components/RepoCard.astro` (1)
- `apps/www/src/content/blog/best-open-source-ai-agents-2026.md` (1)
- `apps/www/src/content/blog/openclaw-vs-hermes-vs-rakazo.md` (1)
- `apps/www/src/grok-alternative.ts` (1)

### infra/compose — 28 hits in 6 files

- `infra/compose/docker-compose.images.yml` (12)
- `infra/compose/docker-compose.prod.yml` (9)
- `infra/compose/.env.images.example` (2)
- `infra/compose/Caddyfile.cloudflare.example` (2)
- `infra/compose/docker-compose.prod.docker.yml` (2)
- `infra/compose/install-images.sh` (1)

### README.md — 22 hits in 1 files

- `README.md` (22)

### apps/www (tests) — 17 hits in 3 files

- `apps/www/src/middleware.test.ts` (13)
- `apps/www/src/download.test.ts` (3)
- `apps/www/src/github.test.ts` (1)

### packages/adapters (tests) — 13 hits in 5 files

- `packages/adapters/src/release-watch.test.ts` (6)
- `packages/adapters/src/keenable-web.test.ts` (2)
- `packages/adapters/src/parallel-web.test.ts` (2)
- `packages/adapters/src/supermemory-memory-provider.test.ts` (2)
- `packages/adapters/src/supermemory-client.test.ts` (1)

### packages/core (tests) — 13 hits in 2 files

- `packages/core/src/self-update.test.ts` (11)
- `packages/core/src/compose-update.test.ts` (2)

### .github/ISSUE_TEMPLATE — 11 hits in 3 files

- `.github/ISSUE_TEMPLATE/config.yml` (4)
- `.github/ISSUE_TEMPLATE/self-host.yml` (4)
- `.github/ISSUE_TEMPLATE/bug.yml` (3)

### infra/updater (tests) — 11 hits in 3 files

- `infra/updater/src/index.test.ts` (6)
- `infra/updater/src/compose-images.test.ts` (3)
- `infra/updater/src/compose-service.test.ts` (2)

### packages/adapters — 11 hits in 5 files

- `packages/adapters/src/release-watch.ts` (3)
- `packages/adapters/src/keenable-web.ts` (2)
- `packages/adapters/src/keyless-http-web.ts` (2)
- `packages/adapters/src/parallel-web.ts` (2)
- `packages/adapters/src/web-ssrf.ts` (2)

### apps/web (tests) — 10 hits in 3 files

- `apps/web/src/pages/shell/composer.test.tsx` (6)
- `apps/web/src/components/SidebarFooter.test.tsx` (2)
- `apps/web/src/lib/composer-draft.test.ts` (2)

### infra/sandboxes (tests) — 9 hits in 2 files

- `infra/sandboxes/supervisor/src/computer-spec.test.ts` (7)
- `infra/sandboxes/supervisor/src/computer-loopback.test.ts` (2)

### docs/self-host.md — 8 hits in 1 files

- `docs/self-host.md` (8)

### CONTRIBUTING.md — 6 hits in 1 files

- `CONTRIBUTING.md` (6)

### apps/api (tests) — 5 hits in 1 files

- `apps/api/src/server-update.test.ts` (5)

### packages/contracts — 4 hits in 2 files

- `packages/contracts/src/client-build.ts` (3)
- `packages/contracts/src/ai-consent.ts` (1)

### .github/workflows — 3 hits in 2 files

- `.github/workflows/ci.yml` (2)
- `.github/workflows/release-android-apk.yml` (1)

### SECURITY.md — 3 hits in 1 files

- `SECURITY.md` (3)

### apps/web — 3 hits in 3 files

- `apps/web/src/components/SidebarFooter.tsx` (1)
- `apps/web/src/lib/composer-draft.ts` (1)
- `apps/web/src/lib/composer-enter-to-send-pref.ts` (1)

### packages/core — 3 hits in 2 files

- `packages/core/src/self-update.ts` (2)
- `packages/core/src/compose-update.ts` (1)

### .env.example — 2 hits in 1 files

- `.env.example` (2)

### SETUP_PROMPT.md — 2 hits in 1 files

- `SETUP_PROMPT.md` (2)

### apps/desktop (tests) — 2 hits in 2 files

- `apps/desktop/src/local-stack.test.ts` (1)
- `apps/desktop/src/window-open.test.ts` (1)

### docs/mobile-release.md — 2 hits in 1 files

- `docs/mobile-release.md` (2)

### infra/sandboxes — 2 hits in 2 files

- `infra/sandboxes/supervisor/src/computer-spec.ts` (1)
- `infra/sandboxes/supervisor/src/index.ts` (1)

### packages/testkit (tests) — 2 hits in 2 files

- `packages/testkit/src/playwright-report-dashboard.ts` (1)
- `packages/testkit/src/release-watch.canary.test.ts` (1)

### apps/desktop — 1 hits in 1 files

- `apps/desktop/src/setup-config.ts` (1)

### infra/railway — 1 hits in 1 files

- `infra/railway/README.md` (1)


## Internal (@rakazo/* packages, RAKAZO_* env, DB/Docker names, code identifiers, comments)

### packages/adapters (tests) — 867 hits in 167 files

Top tokens: `@rakazo/adapter-kit` ×114, `@rakazo/db` ×50, `rakazo-push-` ×38, `process.env.RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC` ×35, `rakazo-shared` ×31, `__rakazoCatalogTool` ×30, `@rakazo/contracts` ×30, `rakazo` ×26, `@rakazo/core` ×20, `@rakazo/logging` ×18, `RAKAZO_AUTO_REVIEW_PROVIDER` ×16, `rakazo:bot-123` ×15

### packages/adapters — 654 hits in 188 files

Top tokens: `@rakazo/adapter-kit` ×172, `@rakazo/contracts` ×83, `@rakazo/db` ×73, `@rakazo/core` ×64, `@rakazo/logging` ×46, `rakazo` ×22, `/home/rakazo` ×19, `Rakazo  (comment)` ×18, `rakazo-background-launch` ×4, `@rakazo/core/node/desktop-runtime` ×4, `rakazo_` ×4, `@rakazo/core/egress` ×3

### infra/sandboxes (tests) — 519 hits in 13 files

Top tokens: `rakazo-browser` ×55, `rakazo.botId` ×46, `rakazo.managed` ×33, `rakazo.spaceId` ×33, `x-rakazo-bot-id` ×26, `x-rakazo-space-id` ×26, `RAKAZO_BROWSER_PROFILE` ×23, `RAKAZO_TEST_ARGS` ×22, `x-rakazo-screen-lease-id` ×13, `/tmp/rakazo/browser-profile-` ×13, `rakazo-focus-or-launch` ×13, `x-rakazo-screen-id` ×12

### apps/mobile (tests) — 507 hits in 87 files

Top tokens: `rakazo.space_id` ×72, `rakazo.session_token` ×53, `x-rakazo-space-id` ×35, `@rakazo/contracts` ×24, `@rakazo/core` ×24, `rakazo.space_rollback` ×24, `@rakazo/ui-tokens` ×19, `com.rakazo.app` ×16, `RAKAZO_SCREENSHOT_BOT_ID` ×15, `RAKAZO_SCREENSHOT_EMAIL` ×13, `rakazo:///account` ×13, `rakazo:///thread` ×12

### packages/testkit (tests) — 486 hits in 83 files

Top tokens: `@rakazo.test` ×136, `@rakazo/adapters` ×39, `@rakazo/db` ×36, `@rakazo/adapter-kit` ×31, `rakazo` ×19, `@rakazo/contracts` ×14, `RAKAZO_BACKUP_AGE_RECIPIENTS` ×12, `@rakazo/core` ×9, `@rakazo/core/node/load-root-env` ×8, `RAKAZO_DEPLOY_DIR` ×6, `rakazo.dump.age` ×5, `rakazo_restore_test` ×5

### apps/web — 447 hits in 181 files

Top tokens: `@rakazo/contracts` ×125, `@rakazo/ui-web` ×92, `@rakazo/core` ×75, `rakazo-shared` ×15, `rakazo-web` ×11, `@rakazo/chat-ui/web` ×9, `rakazoScreen` ×9, `Rakazo` ×7, `data-rakazo-app-state` ×5, `RakazoDesktop` ×5, `Rakazo  (comment)` ×4, `message.rakazoScreen` ×3

### apps/web (tests) — 441 hits in 161 files

Top tokens: `@rakazo.test` ×171, `@rakazo/contracts` ×42, `rakazoScreen` ×36, `@rakazo/ui-web` ×34, `rakazo:space-id` ×18, `@rakazo/core` ×16, `window.rakazoDesktop` ×11, `x-rakazo-space-id` ×11, `rakazoDesktop` ×10, `@rakazo/chat-ui/web` ×9, `.rakazo-organic-avatar` ×7, `RakazoDesktop` ×5

### infra/compose — 409 hits in 22 files

Top tokens: `rakazo-c` ×38, `RAKAZO_DEPLOY_DIR:-/srv/rakazo` ×12, `POSTGRES_DB:-rakazo` ×12, `RAKAZO_HOST` ×10, `POSTGRES_USER:-rakazo` ×9, `RAKAZO_IMAGE:-ghcr.io/elie222/rakazo/app` ×9, `RAKAZO_IPTABLES` ×9, `RAKAZO_IP6TABLES` ×9, `rakazo` ×7, `RAKAZO_IMAGE_TAG` ×6, `RAKAZO_COMPUTER_IMAGE` ×5, `TOPOLOGY_APP_IMAGE:-rakazo/app:topology` ×5

### infra/sandboxes — 374 hits in 23 files

Top tokens: `rakazo-browser` ×38, `rakazo-focus-or-launch` ×23, `/home/rakazo` ×19, `x-rakazo-bot-id` ×17, `x-rakazo-space-id` ×15, `RAKAZO_BROWSER_PROFILE` ×11, `x-rakazo-screen-id` ×9, `x-rakazo-screen-lease-id` ×8, `rakazo-c` ×7, `rakazo.botId` ×7, `rakazo-page-browser` ×6, `rakazo-browser.desktop` ×6

### apps/mobile — 314 hits in 144 files

Top tokens: `@rakazo/contracts` ×83, `@rakazo/core` ×74, `rakazo` ×26, `@rakazo/ui-tokens` ×24, `x-rakazo-space-id` ×12, `com.rakazo.notifications` ×11, `@rakazo/chat-ui/native` ×8, `RakazoNotifications` ×3, `RakazoNetworkCache` ×3, `RakazoNotificationService.stop` ×3, `@rakazo/chat-ui/mermaid` ×2, `window.rakazoComputerKeyboard` ×2

### apps/api (tests) — 270 hits in 50 files

Top tokens: `user@rakazo.test` ×54, `@rakazo/db` ×42, `@rakazo/contracts` ×30, `/tmp/rakazo-router-test` ×22, `rakazo-api` ×16, `@rakazo/adapter-kit` ×15, `@rakazo/adapters` ×10, `@rakazo.test` ×8, `@rakazo/logging` ×8, `postgres://rakazo:rakazo` ×6, `owner@rakazo.test` ×6, `RAKAZO_SECRETS_ALLOW_PRIVATE_HTTP` ×5

### apps/api — 229 hits in 50 files

Top tokens: `@rakazo/db` ×51, `@rakazo/contracts` ×42, `@rakazo/adapter-kit` ×29, `@rakazo/adapters` ×25, `@rakazo/core` ×22, `@rakazo/logging` ×20, `@rakazo/auth` ×6, `@rakazo/core/node/load-root-env` ×4, `rakazo` ×3, `@rakazo/memory` ×2, `@rakazo/core/node/screen-capability` ×2, `@rakazo/core/message-quote` ×2

### packages/ui-web — 215 hits in 41 files

Top tokens: `@rakazo/ui-web/lib/utils` ×36, `.rakazo-organic-avatar` ×24, `.rakazo-organic-avatar-body-working` ×12, `.rakazo-bot-avatar` ×7, `@rakazo/ui-web/components/ui/button` ×6, `.rakazo-organic-avatar-eyes-working` ×6, `.rakazo-organic-avatar-eyes-idle` ×5, `@rakazo/core` ×4, `rakazo-bot-avatar` ×3, `rakazo-bot-avatar-ring` ×3, `--rakazo-eye-animation-name` ×3, `--rakazo-eye-animation-duration` ×3

### docs/self-host.md — 165 hits in 1 files

Top tokens: `RAKAZO_DEPLOY_DIR` ×12, `/srv/rakazo` ×10, `rakazo` ×7, `rakazo_app` ×6, `RAKAZO_UPDATER_TOKEN` ×6, `rakazo-c` ×5, `RAKAZO_IMAGE_TAG` ×5, `@rakazo/api` ×4, `RAKAZO_COMPOSE_FILE` ×4, `rakazo-backup.key` ×4, `RAKAZO_HOST` ×3, `/usr/local/sbin/rakazo-deploy-main` ×3

### apps/www — 160 hits in 23 files

Top tokens: `rakazo` ×89, `row.rakazo` ×6, `/blog/openclaw-vs-hermes-vs-rakazo` ×5, `rakazo/sales-outbound` ×4, `rakazo/inbox-manager` ×4, `rakazo/talent-scout` ×4, `rakazo/expense-manager` ×4, `rakazo/coding-agent` ×4, `rakazo/account-manager` ×4, `rakazo/paid-media` ×4, `rakazo/chief-of-staff` ×4, `Rakazo  (comment)` ×3

### apps/desktop (tests) — 157 hits in 18 files

Top tokens: `https://rakazo.example.com` ×17, `RAKAZO_IMAGE_TAG` ×10, `RAKAZO_WEB_URL` ×10, `data-rakazo-app-state` ×8, `RAKAZO_CLOUD_URL` ×7, `RakazoDesktop` ×5, `rakazo-sso-oauth` ×5, `rakazo-model-oauth` ×5, `rakazo-web-1` ×4, `rakazo` ×4, `isRakazoHealth` ×4, `rakazo-desktop` ×3

### packages/core (tests) — 136 hits in 25 files

Top tokens: `@rakazo/contracts` ×22, `RAKAZO_DESKTOP` ×13, `/tmp/rakazo` ×11, `RAKAZO_IMAGE_TAG` ×9, `RAKAZO_UPDATER_TOKEN` ×5, `https://github.com/someone/rakazo` ×4, `process.env.RAKAZO_TEST_ENV_SENTINEL` ×4, `/tmp/rakazo/control-token-` ×4, `git@github.com:me/rakazo.git` ×4, `https://github.com/me/rakazo` ×4, `/srv/rakazo/infra/compose/docker-compose.prod.yml` ×3, `nRAKAZO_IMAGE_TAG` ×3

### infra/updater (tests) — 124 hits in 9 files

Top tokens: `RAKAZO_IMAGE_TAG` ×19, `RAKAZO_DEPLOY_DIR` ×8, `RAKAZO_COMPOSE_FILE` ×8, `RAKAZO_UPDATER_TOKEN` ×7, `RAKAZO_UPDATE_SERVICES` ×6, `/srv/rakazo` ×5, `nRAKAZO_IMAGE_TAG_PREVIOUS` ×4, `/RAKAZO_COMPOSE_FILE` ×4, `POSTGRES_DB:-rakazo` ×3, `nRAKAZO_IMAGE_TAG` ×3, `RAKAZO_HOST:app.example.com` ×2, `POSTGRES_USER:-rakazo` ×2

### packages/core — 123 hits in 38 files

Top tokens: `@rakazo/contracts` ×35, `/tmp/rakazo` ×7, `/tmp/rakazo/browser-profile-` ×4, `/tmp/rakazo/sockets` ×4, `@rakazo/db` ×3, `/tmp/rakazo/browser-pid-` ×3, `/tmp/rakazo/control-token-` ×3, `RAKAZO_UPDATER_TOKEN` ×3, `@rakazo/core` ×2, `Rakazo  (comment)` ×2, `rakazo-browser` ×2, `/home/rakazo` ×2

### apps/desktop — 81 hits in 20 files

Top tokens: `@rakazo/contracts` ×9, `Rakazo  (comment)` ×9, `RakazoDesktopOAuthCallback` ×4, `@rakazo/ui-tokens` ×3, `@rakazo/web` ×3, `isRakazoHealth` ×3, `RAKAZO_CLOUD_URL` ×3, `rakazo-sso-oauth` ×3, `data-rakazo-app-state` ×2, `@rakazo/contracts/local-settings` ×2, `RAKAZO_IMAGE_TAG` ×2, `RAKAZO_COMPUTER_IMAGE_TAG` ×2

### packages/db — 77 hits in 31 files

Top tokens: `@rakazo/contracts` ×23, `rakazo_app` ×16, `@rakazo/core` ×14, `@rakazo/adapter-kit` ×7, `@rakazo/logging` ×5, `postgres://rakazo:rakazo` ×2, `@rakazo/db` ×1, `postgres://rakazo:rakazo@127.0.0.1:5433/rakazo` ×1, `rakazo/content/v1` ×1, `rakazo/search/v1` ×1, `rakazo` ×1, `rakazo/content-master-key/v1` ×1

### .github/workflows — 74 hits in 10 files

Top tokens: `postgres://rakazo:rakazo` ×14, `@rakazo/desktop` ×10, `postgres://rakazo:rakazo@127.0.0.1:5433/rakazo` ×7, `rakazo` ×7, `@rakazo/web` ×5, `@rakazo/adapters` ×5, `HOME/.ssh/rakazo-production` ×4, `RUNNER_TEMP/rakazo.apk` ×4, `rakazo.apk` ×4, `@rakazo/mobile` ×3, `RAKAZO_ALLOW_DEV_SECRETS` ×2, `Rakazo  (comment)` ×2

### pnpm-lock.yaml — 59 hits in 1 files

Top tokens: `@rakazo/* (lockfile)` ×59

### .env.example — 50 hits in 1 files

Top tokens: `rakazo` ×3, `RAKAZO_DEPLOY_DIR` ×3, `RAKAZO_COMPOSE_FILE` ×3, `RAKAZO_UPDATE_SERVICES` ×2, `rakazo.uiLocale` ×2, `rakazo_app` ×1, `postgres://rakazo_app:REPLACE_WITH_POSTGRES_APP_PASSWORD` ×1, `postgres://rakazo_app:REPLACE_WITH_POSTGRES_APP_PASSWORD@127.0.0.1:5433/rakazo` ×1, `postgres://rakazo:REPLACE_WITH_POSTGRES_PASSWORD` ×1, `postgres://rakazo:REPLACE_WITH_POSTGRES_PASSWORD@127.0.0.1:5433/rakazo` ×1, `RAKAZO_CSP_SCRIPT_SRC` ×1, `RAKAZO_CSP_CONNECT_SRC` ×1

### packages/logging (tests) — 48 hits in 5 files

Top tokens: `rakazo-api` ×35, `rakazo-worker` ×6, `rakazo-logs` ×3, `__rakazoLog` ×3, `rakazo` ×1

### packages/db (tests) — 36 hits in 14 files

Top tokens: `@rakazo/contracts` ×7, `@rakazo.test` ×5, `postgres://rakazo:rakazo` ×4, `@rakazo/core` ×3, `@rakazo/adapter-kit` ×2, `postgres://rakazo:rakazo@127.0.0.1:9/rakazo` ×2, `rakazo-test` ×2, `postgres://rakazo:owner-password` ×2, `rakazo` ×2, `postgres://rakazo:owner-password@postgres:5432/rakazo` ×1, `postgres://rakazo_app:app-password` ×1, `postgres://rakazo_app:app-password@postgres:5432/rakazo` ×1

### infra/updater — 29 hits in 4 files

Top tokens: `@rakazo/core` ×4, `@rakazo/logging` ×3, `@rakazo/updater` ×2, `@rakazo/contracts` ×2, `RAKAZO_DEPLOY_DIR` ×2, `RAKAZO_COMPOSE_FILE` ×2, `RAKAZO_UPDATE_SERVICES` ×2, `@rakazo/logging/axiom` ×1, `@rakazo/logging/hono` ×1, `source.RAKAZO_DEPLOY_DIR` ×1, `.rakazo-update-` ×1, `env.RAKAZO_DEPLOY_DIR` ×1

### packages/ui-web (tests) — 27 hits in 3 files

Top tokens: `rakazo-organic-avatar` ×7, `rakazo-bot-avatar-visor` ×5, `rakazo-bot-avatar-eyes` ×4, `rakazo-bot-avatar-picture` ×3, `@rakazo/core` ×2, `rakazo-bot-avatar-ring` ×2, `.rakazo-organic-avatar-body-working` ×1, `rakazo-eyes-idle-` ×1, `rakazo-bot-avatar` ×1, `rakazo-bot-avatar-ring-working` ×1

### docs/self-host-restricted-network.md — 24 hits in 1 files

Top tokens: `RAKAZO_DOWNLOAD_BASE` ×4, `RAKAZO_INSTALLER_URL` ×3, `RAKAZO_DOWNLOAD_SKIP_EXISTING` ×2, `RAKAZO_IMAGE` ×2, `RAKAZO_IMAGE_TAG` ×2, `RAKAZO_COMPUTER_IMAGE` ×2, `RAKAZO_COMPUTER_IMAGE_TAG` ×2, `https://example.com/mirror/rakazo/infra/compose` ×2, `rakazo` ×2, `https://example.com/mirror/rakazo/infra/compose/install-images.sh` ×1, `registry.example.com/mirror/rakazo/app` ×1, `registry.example.com/mirror/rakazo/computer` ×1

### apps/worker — 21 hits in 3 files

Top tokens: `@rakazo/adapters` ×4, `@rakazo/core` ×4, `@rakazo/adapter-kit` ×3, `@rakazo/db` ×2, `@rakazo/logging` ×2, `@rakazo/memory` ×2, `@rakazo/worker` ×1, `@rakazo/core/node/load-root-env` ×1, `@rakazo/logging/axiom` ×1, `rakazo-worker` ×1

### packages/contracts — 19 hits in 8 files

Top tokens: `Rakazo  (comment)` ×4, `RakazoDesktopUpdate` ×2, `RakazoDesktopOAuthCallback` ×2, `@rakazo/contracts` ×1, `@rakazo/core` ×1, `RAKAZO_` ×1, `x-rakazo-client-build` ×1, `x-rakazo-build` ×1, `RAKAZO_MIN_CLIENT_BUILD` ×1, `RakazoDesktop` ×1, `rakazoDesktop` ×1, `RakazoSetup` ×1

### infra/systemd — 15 hits in 4 files

Top tokens: `rakazo/alerts` ×3, `/var/lib/rakazo/alerts` ×3, `-/etc/rakazo/backup.env` ×2, `/usr/local/sbin/rakazo-host-alert` ×1, `rakazo-backup.service` ×1, `/etc/systemd/system/rakazo-backup.service.d/alerts.conf` ×1, `rakazo-backup-alert.service` ×1, `-/usr/local/sbin/rakazo-host-alert` ×1, `/usr/local/sbin/rakazo-backup` ×1, `/usr/local/sbin/rakazo-host-check` ×1

### packages/auth — 14 hits in 5 files

Top tokens: `@rakazo/db` ×4, `@rakazo/adapter-kit` ×3, `@rakazo/core` ×3, `@rakazo/auth` ×1, `Rakazo  (comment)` ×1, `x-rakazo-client-ip` ×1, `rakazo` ×1

### packages/auth (tests) — 14 hits in 4 files

Top tokens: `@rakazo/db` ×5, `https://rakazo.test/reset-password` ×2, `rakazo://sign-in` ×2, `rakazo` ×2, `@rakazo/adapter-kit` ×1, `https://rakazo.example.test` ×1, `@rakazo/core` ×1

### packages/chat-ui — 14 hits in 8 files

Top tokens: `@rakazo/ui-tokens` ×6, `@rakazo/contracts` ×3, `@rakazo/ui-web` ×3, `@rakazo/chat-ui` ×1, `Rakazo  (comment)` ×1

### scripts — 13 hits in 3 files

Top tokens: `rakazo` ×7, `rakazo_app` ×2, `OUT/rakazo.sql` ×1, `RAKAZO_BACKUP_SKIP_HOMES:-0` ×1, `@rakazo` ×1, `SRC/rakazo.sql` ×1

### README.md — 11 hits in 1 files

Top tokens: `rakazo` ×3, `RAKAZO_DOWNLOAD_BASE` ×1, `RAKAZO_DOWNLOAD_SKIP_EXISTING` ×1, `RAKAZO_HOST` ×1, `rakazo_app` ×1, `@rakazo/desktop` ×1, `RAKAZO_DOCKER_BINARY` ×1, `RAKAZO_WEB_URL` ×1, `RAKAZO_FORCE_SETUP` ×1

### infra/railway — 11 hits in 2 files

Top tokens: `@rakazo/api` ×4, `@rakazo/worker` ×2, `@rakazo/web` ×2, `@rakazo/db` ×1, `RAKAZO_ALLOW_DEV_SECRETS` ×1, `RAKAZO_ALLOWED_HOSTS` ×1

### package.json — 10 hits in 1 files

Top tokens: `@rakazo/db` ×3, `@rakazo/api` ×2, `rakazo` ×1, `@rakazo/worker` ×1, `@rakazo/web` ×1, `@rakazo/sandbox-supervisor` ×1, `rakazo/computer:local` ×1

### SETUP_PROMPT.md — 9 hits in 1 files

Top tokens: `rakazo_app` ×3, `RAKAZO_INSTALLER_URL` ×1, `https://example.com/mirror/rakazo/infra/compose/install-images.sh` ×1, `RAKAZO_DOWNLOAD_BASE` ×1, `RAKAZO_DOWNLOAD_SKIP_EXISTING` ×1, `rakazo` ×1, `@rakazo/desktop` ×1

### infra/compose (tests) — 8 hits in 1 files

Top tokens: `rakazo` ×3, `/var/lib/rakazo/firewall-change` ×1, `/usr/local/sbin/rakazo-host-alert` ×1, `rakazo.dump` ×1, `RAKAZO_BACKUP_ALLOW_PLAINTEXT` ×1, `RAKAZO_BACKUP_REQUIRE_VOLUME` ×1

### packages/logging — 7 hits in 4 files

Top tokens: `@rakazo/logging` ×1, `rakazo-api` ×1, `rakazo-worker` ×1, `rakazo-sandbox-supervisor` ×1, `rakazo-updater` ×1, `__rakazoLog` ×1, `rakazo` ×1

### packages/memory — 7 hits in 2 files

Top tokens: `@rakazo/adapter-kit` ×3, `@rakazo/db` ×3, `@rakazo/memory` ×1

### packages/contracts (tests) — 6 hits in 3 files

Top tokens: `RAKAZO_TOKEN` ×2, `RAKAZO_CSP_SCRIPT_SRC` ×2, `rakazo-token` ×1, `/RAKAZO_MIN_CLIENT_BUILD` ×1

### CHANGELOG.md — 5 hits in 1 files

Top tokens: `rakazo_app` ×1, `RAKAZO_OPENAI_COMPAT_PRIVATE_HOSTS` ×1, `RAKAZO_LOCAL_MODELS` ×1, `RAKAZO_CSP_SCRIPT_SRC` ×1, `RAKAZO_CSP_CONNECT_SRC` ×1

### docs/content-encryption.md — 5 hits in 1 files

Top tokens: `@rakazo/api` ×4, `@rakazo/adapter-kit` ×1

### docs/infisical-secrets.md — 5 hits in 1 files

Top tokens: `@rakazo/api` ×4, `/rakazo` ×1

### docs/self-host-secrets.md — 5 hits in 1 files

Top tokens: `rakazo` ×2, `rakazo_app` ×1, `RAKAZO_UPDATER_TOKEN` ×1, `RAKAZO_AUTO_REVIEW_PROVIDER` ×1

### packages/adapter-kit — 5 hits in 4 files

Top tokens: `@rakazo/contracts` ×4, `@rakazo/adapter-kit` ×1

### packages/ui-tokens — 5 hits in 4 files

Top tokens: `@rakazo/ui-tokens` ×4, `rakazo.uiAppearance` ×1

### packages/memory (tests) — 4 hits in 2 files

Top tokens: `@rakazo/adapter-kit` ×2, `@rakazo/db` ×2

### docs/bot-secrets.md — 3 hits in 1 files

Top tokens: `RAKAZO_SECRETS_ALLOW_PRIVATE_HTTP` ×2, `RAKAZO_` ×1

### docs/computer-runtime.md — 3 hits in 1 files

Top tokens: `rakazo` ×1, `/home/user/rakazo-home` ×1, `RAKAZO_COMPUTER_IMAGE` ×1

### docs/self-host-sandbox-providers.md — 3 hits in 1 files

Top tokens: `RAKAZO_COMPUTER_IMAGE` ×1, `RAKAZO_COMPUTER_IMAGE_TAG` ×1, `rakazo-computer` ×1

### packages/chat-ui (tests) — 3 hits in 3 files

Top tokens: `@rakazo/ui-tokens` ×3

### turbo.json — 3 hits in 1 files

Top tokens: `RAKAZO_HOST` ×1, `RAKAZO_DEV_HOST` ×1, `RAKAZO_ALLOWED_HOSTS` ×1

### .github/scripts — 2 hits in 1 files

Top tokens: `/rakazo-mobile-screenshots.log` ×1, `/rakazo-mobile-android.log` ×1

### AGENTS.md — 2 hits in 1 files

Top tokens: `@rakazo/desktop` ×1, `@rakazo/ui-tokens` ×1

### CONTRIBUTING.md — 2 hits in 1 files

Top tokens: `@rakazo/web` ×2

### apps/www (tests) — 2 hits in 1 files

Top tokens: `process.env.RAKAZO_GITHUB_API` ×2

### docs/agent-verification.md — 2 hits in 1 files

Top tokens: `rakazo/computer:local` ×2

### .agents — 1 hits in 1 files

Top tokens: `rakazo-playwright-screenshots` ×1

### .agents (tests) — 1 hits in 1 files

Top tokens: `rakazo-playwright-screenshots` ×1

### .gitattributes — 1 hits in 1 files

Top tokens: `infra/sandboxes/computer/rakazo-browser` ×1

### apps/worker (tests) — 1 hits in 1 files

Top tokens: `@rakazo/adapters` ×1

### docs/mobile-release.md — 1 hits in 1 files

Top tokens: `@rakazo/mobile` ×1

### docs/tool-activity.md — 1 hits in 1 files

Top tokens: `rakazo.showToolActivity` ×1


## Tracked paths whose file or directory name contains "rakazo" (33)

File names are internal unless they are a visible brand asset; renaming them is a rename-heavy diff on every upstream merge.

| Path | Group | Treatment |
|---|---|---|
| `apps/mobile/modules/rakazo-network-cache/** (4 files)` | internal | kept (native module identifiers) |
| `apps/mobile/modules/rakazo-notifications/** (13 files)` | internal | kept (native module identifiers) |
| `apps/www/public/brand/rakazo-mark.png` | app identity (logo) | replaced by placeholder `nurlings-mark.png`; Rakazo logo not used |
| `apps/www/public/og/blog-openclaw-vs-hermes-vs-rakazo.png` | user-facing (OG image) | regenerated by `render-og.mjs` with new mark; slug follows blog decision Q2 |
| `apps/www/src/content/blog/openclaw-vs-hermes-vs-rakazo.md` | user-facing (blog slug) | content per Q2; slug kept so URLs/redirects stay stable |
| `infra/sandboxes/computer/rakazo-browser.desktop` | internal | kept |
| `infra/sandboxes/computer/rakazo-browser` | internal | kept |
| `infra/sandboxes/computer/rakazo-focus-or-launch` | internal | kept |
| `infra/sandboxes/computer/rakazo-local-bin.sh` | internal | kept |
| `infra/sandboxes/computer/rakazo-page-browser` | internal | kept |
| `infra/systemd/rakazo-backup-alert.service` | internal | kept |
| `infra/systemd/rakazo-backup-alerts.conf.example` | internal | kept |
| `infra/systemd/rakazo-backup.service` | internal | kept |
| `infra/systemd/rakazo-backup.timer` | internal | kept |
| `infra/systemd/rakazo-host-check.service` | internal | kept |
| `infra/systemd/rakazo-host-check.timer` | internal | kept |
| `packages/ui-tokens/assets/Rakazo.icon/Assets/orange-bot.png` | app identity (icon source) | replaced by `Nurlings.icon` placeholder bundle; Rakazo mascot not used |
| `packages/ui-tokens/assets/Rakazo.icon/icon.json` | app identity (icon source) | replaced by `Nurlings.icon` placeholder bundle; Rakazo mascot not used |
