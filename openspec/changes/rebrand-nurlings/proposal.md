# Proposal: White-label the customer-facing UI as Nurlings

## Why

Nurlings will be deployed for our clients. Clients see exactly three things: the **web app**, the
**desktop (Electron) app** and the **mobile (Expo) app**. Those must read Nurlings, by Nurturist
AI, with no trace of Rakazo. Clients never see the API, worker, database, images or CI, so those
stay as upstream ships them. Keeping the change to the customer-facing UI also keeps the fork
easy to merge: we keep pulling Rakazo updates.

## Scope

| In scope (customer-facing UI) | Out of scope (removed from this change) |
|---|---|
| **Web app**: every visible "Rakazo", page titles, sign-in headings, sidebar, favicon, logo/wordmark, "Powered by Nurturist AI" line | API/server code, emails, auth origins, passkey config |
| **Desktop (Electron)**: visible text, app display name, window title, icons, about screen (the upstream app has no tray, so there is nothing to brand) | Model-facing prompts ("You are a Rakazo bot…") |
| **Mobile (Expo)**: visible text, app display name, icons, splash | Bot User-Agent |
| **Visible links** in those UIs → https://nurlings.nurturistai.com; Rakazo Discord/GitHub/cloud links removed | Server self-update |
| **Desktop setup**: remove the option to sign in to Rakazo's hosted cloud | Docker images, installer, compose, CI publishing |
| **Disable** the desktop auto-updater and mobile OTA updates (disable only, no re-pointing) | `apps/www` marketing site |
| **Central brand config** feeding all of the above | Telemetry (already env-gated; left alone) |
| **LICENSE** kept untouched; **NOTICE** with Rakazo credit | Internal identifiers: `@rakazo/*`, `RAKAZO_*`, DB names, code identifiers |

Decisions you made (all recorded in `design.md`): (1) UI copy says **Nurling / Nurlings** instead of
bot/bots; (2) `apps/www` out; (3) **native identifiers unchanged**: bundle id, Android package,
`rakazo://` scheme (changing them needs API changes), only display names and icons change;
(4) self-update out; (5) model-facing text out.

## What Changes

- **Central brand config** (new leaf package `packages/brand`): name, bot singular/plural,
  "Powered by Nurturist AI" tagline, company, site URL, theme colours, logo/icon paths, and feature
  flags (updaters off). UI code reads it instead of hardcoding "Nurlings".
- **Web**: upstream's translated strings (Lingui, 12 locales) are rebranded when the catalog is
  loaded, which also rewrites English "bot(s)" to "Nurling(s)"; the `.po` files stay identical to
  upstream. The ~20 source files with hardcoded text/links (sign-in, wordmark, sidebar footer,
  settings copy) read the config. Page title, `apple-mobile-web-app-title`, web manifest and
  favicons are generated from the config/assets.
- **Desktop**: display name (`productName`), window title, setup window, menus and dialogs,
  macOS microphone prompt, About panel with the tagline, icons. The hosted-cloud choice is removed
  from setup. The auto-updater is switched off.
- **Mobile**: display name, permission prompts, icons, splash, all via the existing
  `app.config.ts` (which already wraps `app.json`, left upstream-identical). OTA updates are
  switched off. Bundle id, package and scheme are **not** touched.
- **Visible links**: sidebar "Docs" and the AI-privacy link → the Nurlings site; "Get the mobile
  app" and the mobile force-update prompt no longer open Rakazo's App Store listing or APK.
  (No Discord or waitlist link exists in these three UIs; they were only in README/`apps/www`.)
- **License**: `LICENSE` untouched; new `NOTICE` crediting Rakazo by Elie Steinbock (Apache-2.0,
  link to the original repo).
- **Guardrail**: `brand:check` fails if "Rakazo" is visible in any rendered catalog or generated
  UI identity, so an upstream merge cannot quietly bring the name back.

## Capabilities

### New Capabilities
- `brand-config`: the single source of truth for brand values and how each UI consumes it.
- `user-facing-branding`: all text people read in the web, desktop and mobile UIs says Nurlings /
  Nurling(s).
- `app-identity`: display names, window/page titles, icons, favicons and splash, plus the
  placeholder assets; native identifiers explicitly unchanged.
- `external-links`: where visible links point, which Rakazo links are removed, and that the
  desktop auto-updater and mobile OTA are disabled.
- `license-attribution`: Apache-2.0 compliance — `LICENSE` untouched, `NOTICE` with credit.

### Modified Capabilities
None — `openspec/specs/` is empty; these specs are created by archiving this change.

## Impact

- **Code to edit** (from the inventory below): 20 source files with user-facing text, 8 with
  display-name/identity (incl. icon sources and the asset export script), ~4 source files with
  visible links, and ~25 test files that assert the old text. 23 locale/translation files carry
  the name but are **not edited** (the load-time seam handles them). Everything else is new and
  additive (`packages/brand`, `NOTICE`, assets, guard).
- **Build**: desktop display name via a layered electron-builder config (or the 2–3 identity
  lines guarded by `brand:check`); mobile via `app.config.ts`; web `index.html`/manifest via a
  small Vite plugin.
- **Upstream merges**: only 433 of the 8,696 occurrences (5%) are in scope and not internal, and
  the edits to upstream files are small and mechanical (a one-line seam call, a config read, a
  literal replaced by `brand.*`). The other 95% — out of scope or internal — are untouched.

## What stays as-is on purpose

| Kept | Why |
|---|---|
| **iOS bundle id / Android package `com.rakazo.app`, URL scheme `rakazo://`, Expo `slug`**, desktop `appId` `dev.rakazo.desktop` and Linux `executableName` | Your decision (3): the API trusts `rakazo://` and the passkey config names the package; changing them needs API work |
| `@rakazo/*` packages (≈2,300 references), `RAKAZO_*` env vars, `x-rakazo-*` headers, DB/Docker/systemd names, storage keys (`rakazo.*`), native module names, TS identifiers | Out of scope; internal; renaming would make every upstream merge huge |
| API, auth, emails, adapters, prompts, User-Agent, self-update, infra, CI, docs, README, `apps/www` | Out of scope (customer-facing UI only) |
| Telemetry (PostHog / Sentry / Axiom) | Already env-gated and off by default; no key or DSN in the repo |

Rule of thumb: **if a client can read or click it in the web, desktop or mobile UI, it is
branded; if only code can, it stays.**

## Things you should know (not changed by this proposal)

1. **Your clients only get this UI if they run images built from this repo.** The web UI inside
   a deployment is served from the Docker image, and the installer/compose files pull
   `ghcr.io/elie222/rakazo/*`. Docker/CI publishing is out of scope, so until we build and host
   our own images, a deployment installed with the stock installer still shows **Rakazo's**
   web UI. The web app is rebranded in this repo; getting it in front of clients is the image
   work you deferred.
2. **Bundle id and package name are Rakazo's.** Apple and Google
   require globally unique identifiers, so we generally cannot register `com.rakazo.app` in our
   own App Store Connect or Play Console account, which blocks normal store and TestFlight
   distribution of the mobile app. Development builds and sideloaded Android APKs are not affected.
   This follows your decision (3); flagging it so it is a conscious one. Changing it later is
   possible but needs the API-side work (`rakazo://` trusted origin, passkey package) you want to
   avoid now.
3. **Server-supplied text still says Rakazo** in a few places a client could see: model/billing
   blurbs from `packages/adapters` (`pi-models.ts`, `pi-oauth.ts`: "Rakazo does not pay for model
   usage…"), self-update status messages, secrets-guard errors, account/verification emails, chat
   channel messages, and the name shown on third-party OAuth consent screens. Out of scope by your
   call; the final verification lists exactly which of these the UI walk-through hits.
4. **Mobile builds need your own Expo project.** `owner: inbox-zero` and the EAS `projectId` in
   `app.json` are Rakazo's; with OTA disabled they are inert at runtime, but EAS builds, and CI's
   `eas update` job (CI publishing, out of scope), still target them.
5. **README, `docs/`, issue templates and `SECURITY.md`** are not in your in-scope list, so they
   still describe Rakazo (and README still shows its Discord/App Store/Railway badges). Say the word
   if you want the README rewritten after all.

## Placeholder assets and the sizes each platform needs

Placeholders live in **one folder**, `packages/brand/assets/`, with names that say what they are;
upstream's `ui-tokens` `export:brand` generator (which already derives every size from one source
image) is repointed at it, and no longer writes into `apps/www`. Drop real artwork over the files
marked **source**; do not hand-edit generated files.

| Surface | File(s) the app uses | Size / format | Source asset |
|---|---|---|---|
| macOS (Electron) | `Nurlings.icon` bundle (Icon Composer; compiled by electron-builder, Xcode 26+) | 1024×1024 PNG layer | `app-icon/Nurlings.icon` |
| Windows (Electron) | `icon.ico` | frames 16, 32, 48, 64, 128, 256 | `app-icon/app-icon-1024.png` |
| Linux (Electron) | `icon.png` | 1024×1024 (≥512 required) | `app-icon/app-icon-1024.png` |
| Tray (Electron) | — upstream has no tray; none added | — | — |
| iOS | `Nurlings.icon` bundle (Expo `ios.icon`) | 1024×1024; **no alpha** for the App Store copy | `app-icon/Nurlings.icon` |
| Android launcher | `icon.png`; adaptive `foreground`, `background`, `monochrome` | 1024×1024 each; adaptive art inside the central 66% safe zone | `android/*` |
| Android notification | `notification-icon.png` | 72×72 white-on-alpha silhouette | `android/notification-72.png` |
| Android store (manual) | Play hi-res icon / feature graphic | 512×512 / 1024×500 | `app-icon`, `social` |
| Mobile splash | `splash-icon.png` (+ bg `#FCFCFC` light / `#141414` dark from brand colours) | 1024×1024 transparent, art ≈620px centred | `splash/splash-icon-1024.png` |
| Mobile web | `favicon.png` | 128×128 | `favicon/favicon-128.png` |
| Web app (`apps/web/public`) | `favicon.ico` (16, 32, 48), `favicon-16x16`, `favicon-32x32`, `favicon.png` 128, `apple-touch-icon` 180, `icon-192`, `icon-512`, manifest icons | as listed | `app-icon/app-icon-1024.png` |
| In-app wordmark | `Wordmark` component in `packages/ui-web` (CSS face + name today) | SVG/CSS; reads brand name | `logo/nurlings-wordmark.svg` |

Apple/Google accounts, signing certificates and store listings are **manual** (listed again in the
PR). The Rakazo orange-bot mascot and `rakazo-mark.png` are not reused anywhere in our branding.

## Gate

**Implementation does not start until you approve this proposal.** Nothing in it is blocking: the
two items worth a conscious yes are the bundle-id consequence (#2 above) and README/docs staying
as-is (#5).

---

# Appendix A — Occurrence inventory ("rakazo", case-insensitive)

Generated from `git grep -nIi rakazo` on `main` (= upstream `46eeb1c2`), excluding `openspec/`,
classified by [`inventory.py`](./inventory.py) in this change folder (re-runnable; also used for
the final "what remains" check). Classification is rule-based (path + context + token shape), so
a handful of lines may be filed one group off; the final grep pass re-checks every remaining
occurrence by hand. **Line-level** listings of the in-scope user-facing / identity / link
occurrences are in [`inventory-lines.md`](./inventory-lines.md) (locale catalogs list the English
file only — the other 11 locales repeat the same message IDs). Internal occurrences are summarised
per area with their top tokens, not per line.


Total occurrences in tracked text files: **8696** in **1565** files.

| Group | In scope: hits (files) | Out of scope: hits (files) |
|---|---:|---:|
| user-facing | 397 (68) | 593 (120) |
| app-identity | 26 (8) | 20 (7) |
| external-links | 10 (7) | 289 (60) |
| internal | 2224 (674) | 5137 (825) |

**In scope** = customer-facing UI: `apps/web`, `apps/desktop`, `apps/mobile`, `packages/ui-web`, `packages/chat-ui`, `packages/ui-tokens`, and three shared UI constants in `packages/contracts`. **Out of scope** = everything else (API/server, auth, adapters, core, infra, CI, docs, `apps/www`, root docs, test kit). Out-of-scope hits are kept as-is.

## User-facing (UI text, page titles, sign-in headings, onboarding, errors, docs shown to users)

### In scope — 397 hits

#### apps/web — 229 hits in 25 files

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

#### apps/mobile — 69 hits in 10 files

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

#### apps/mobile (tests) — 39 hits in 12 files

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

#### apps/desktop (tests) — 30 hits in 6 files

- `apps/desktop/e2e/setup.spec.ts` (19)
- `apps/desktop/e2e/local-stack.spec.ts` (4)
- `apps/desktop/src/setup-config.test.ts` (3)
- `apps/desktop/e2e/smoke.spec.ts` (2)
- `apps/desktop/e2e/window-drag.spec.ts` (1)
- `apps/desktop/src/package-metadata.test.ts` (1)

#### apps/desktop — 15 hits in 6 files

- `apps/desktop/src/setup.js` (5)
- `apps/desktop/src/main.ts` (4)
- `apps/desktop/src/browser-auth.ts` (2)
- `apps/desktop/src/local-stack.ts` (2)
- `apps/desktop/package.json` (1)
- `apps/desktop/src/auto-update.ts` (1)

#### apps/web (tests) — 13 hits in 7 files

- `apps/web/e2e/auth-lifecycle.spec.ts` (6)
- `apps/web/e2e/fixtures/marketing-shots.tsx` (2)
- `apps/web/e2e/helpers.ts` (1)
- `apps/web/e2e/model-settings.spec.ts` (1)
- `apps/web/e2e/settings-shell.spec.ts` (1)
- `apps/web/src/novnc-html.test.ts` (1)
- `apps/web/src/pages/ModelSettingsOverlay.test.tsx` (1)

#### packages/contracts — 1 hits in 1 files

- `packages/contracts/src/openai-compatible-ui.ts` (1)

#### packages/ui-web — 1 hits in 1 files

- `packages/ui-web/src/bot-avatar.tsx` (1)

### Out of scope — 593 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| apps/www | 381 | 41 | `Rakazo` ×380, `Rakazo-Startseite` ×1 |
| docs/self-host.md | 25 | 1 | `Rakazo` ×25 |
| packages/adapters | 23 | 12 | `Rakazo` ×20, `Rakazo-owned` ×3 |
| packages/adapters (tests) | 20 | 13 | `Rakazo` ×17, `Rakazo-owned` ×3 |
| packages/testkit (tests) | 19 | 7 | `Rakazo` ×18, `Contents/MacOS/Rakazo` ×1 |
| README.md | 14 | 1 | `Rakazo` ×14 |
| packages/auth | 14 | 2 | `Rakazo` ×14 |
| infra/compose | 12 | 5 | `Rakazo` ×12 |
| docs/computer-runtime.md | 9 | 1 | `Rakazo` ×6, `Rakazo-owned` ×3 |
| infra/railway | 9 | 1 | `Rakazo` ×9 |
| SETUP_PROMPT.md | 7 | 1 | `Rakazo` ×7 |
| apps/api | 7 | 2 | `Rakazo` ×7 |
| .github/ISSUE_TEMPLATE | 5 | 3 | `Rakazo` ×5 |
| VISION.md | 5 | 1 | `Rakazo` ×5 |
| infra/sandboxes | 5 | 4 | `Rakazo` ×5 |
| packages/auth (tests) | 5 | 2 | `Rakazo` ×5 |
| apps/www (tests) | 4 | 2 | `Rakazo` ×4 |
| packages/core | 4 | 3 | `Rakazo` ×3, `d:Rakazo` ×1 |
| .github/workflows | 3 | 3 | `out/mac-arm64/Rakazo.app/Contents/MacOS/Rakazo` ×1, `Rakazo` ×1, `app/Contents/MacOS/Rakazo` ×1 |
| CHANGELOG.md | 3 | 1 | `Rakazo` ×3 |
| docs/mobile-release.md | 3 | 1 | `Rakazo` ×3 |
| CONTRIBUTING.md | 2 | 1 | `Rakazo` ×2 |
| apps/api (tests) | 2 | 1 | `Rakazo` ×2 |
| docs/agent-verification.md | 2 | 1 | `Rakazo` ×2 |
| infra/systemd | 2 | 2 | `Rakazo` ×2 |
| AGENTS.md | 1 | 1 | `Rakazo` ×1 |
| LICENSE | 1 | 1 | `Rakazo` ×1 |
| SECURITY.md | 1 | 1 | `Rakazo` ×1 |
| docs/ai-data-sharing-review.md | 1 | 1 | `Rakazo` ×1 |
| docs/content-encryption.md | 1 | 1 | `Rakazo` ×1 |
| docs/context-and-evals-tasks.md | 1 | 1 | `Rakazo` ×1 |
| docs/performance.md | 1 | 1 | `Rakazo` ×1 |
| infra/compose (tests) | 1 | 1 | `Rakazo` ×1 |


## App identity (Electron/Expo display names, icons, splash, favicons, manifests)

### In scope — 26 hits

#### apps/desktop — 13 hits in 3 files

- `apps/desktop/package.json` (7)
- `apps/desktop/src/setup.html` (5)
- `apps/desktop/assets/README.md` (1)

#### apps/mobile — 6 hits in 1 files

- `apps/mobile/app.json` (6)

#### apps/web — 4 hits in 2 files

- `apps/web/index.html` (2)
- `apps/web/public/site.webmanifest` (2)

#### packages/ui-tokens — 3 hits in 2 files

- `packages/ui-tokens/scripts/export-brand.ts` (2)
- `packages/ui-tokens/assets/README.md` (1)

### Out of scope — 20 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| apps/www (tests) | 8 | 2 | `Rakazo-1.0.0-universal.dmg` ×2, `Rakazo-1.0.0.AppImage` ×2, `Rakazo-2.0.0-universal.dmg` ×1 |
| .github/workflows | 6 | 2 | `apps/desktop/out/mac-universal/Rakazo.app` ×2, `apps/desktop/out/mac-arm64/Rakazo.app/Contents/Resources/Assets.car` ×1, `apps/desktop/out/mac-arm64/Rakazo.app/Contents/Resources/icon.icns` ×1 |
| README.md | 2 | 1 | `Rakazo-` ×1, `./Rakazo-` ×1 |
| apps/www | 2 | 1 | `Rakazo` ×2 |
| packages/testkit (tests) | 2 | 1 | `Rakazo.app` ×2 |


## External links (rakazo.com, GitHub, Discord, Cloud/waitlist, store/APK, registries, update feeds)

### In scope — 10 hits

#### packages/contracts — 4 hits in 2 files

- `packages/contracts/src/client-build.ts` (3)
- `packages/contracts/src/ai-consent.ts` (1)

#### apps/desktop (tests) — 2 hits in 2 files

- `apps/desktop/src/local-stack.test.ts` (1)
- `apps/desktop/src/window-open.test.ts` (1)

#### apps/web (tests) — 2 hits in 1 files

- `apps/web/src/components/SidebarFooter.test.tsx` (2)

#### apps/desktop — 1 hits in 1 files

- `apps/desktop/src/setup-config.ts` (1)

#### apps/web — 1 hits in 1 files

- `apps/web/src/components/SidebarFooter.tsx` (1)

### Out of scope — 289 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| apps/www | 120 | 17 | `hello@rakazo.com` ×11, `https://rakazo.com/self-hosted-ai-agent` ×10, `https://github.com/elie222/rakazo/blob/main/docs/self-host.md` ×9 |
| infra/compose | 28 | 6 | `RAKAZO_IMAGE:-ghcr.io/elie222/rakazo/app` ×9, `RAKAZO_IMAGE_TAG:-edge` ×4, `RAKAZO_IMAGE_TAG:-local` ×4 |
| README.md | 22 | 1 | `https://github.com/elie222/rakazo/releases/download/android/rakazo.apk` ×4, `https://apps.apple.com/app/rakazo/id6801531099` ×2, `https://img.shields.io/github/stars/elie222/rakazo` ×1 |
| apps/www (tests) | 17 | 3 | `https://rakazo.com` ×5, `https://github.com/elie222/rakazo/releases/download/v2.0.0/Rakazo-2.0.0-universal.dmg` ×2, `www.rakazo.com` ×2 |
| packages/adapters (tests) | 13 | 5 | `elie222/rakazo` ×6, `http://localhost:6767/v3/container-tags/rakazo` ×3, `Rakazo/0.1` ×2 |
| packages/core (tests) | 13 | 2 | `https://github.com/elie222/rakazo.git` ×3, `https://github.com/elie222/rakazo` ×2, `https://git.example.com:8443/team/rakazo.git` ×2 |
| .github/ISSUE_TEMPLATE | 11 | 3 | `security@rakazo.com` ×3, `https://github.com/elie222/rakazo/blob/main/SECURITY.md` ×3, `mailto:security@rakazo.com` ×2 |
| infra/updater (tests) | 11 | 3 | `https://github.com/elie222/rakazo` ×6, `ghcr.io/elie222/rakazo/app` ×2, `ghcr.io/elie222/rakazo/computer` ×1 |
| packages/adapters | 11 | 5 | `Rakazo/0.1` ×4, `https://github.com/elie222/rakazo` ×4, `https://github.com/elie222/rakazo/releases/tag/v0.4.2` ×1 |
| docs/self-host.md | 8 | 1 | `ghcr.io/elie222/rakazo/computer` ×3, `ghcr.io/elie222/rakazo/app` ×2, `https://raw.githubusercontent.com/elie222/rakazo/main/infra/compose/install-images.sh` ×1 |
| CONTRIBUTING.md | 6 | 1 | `security@rakazo.com` ×1, `mailto:security@rakazo.com` ×1, `support@rakazo.com` ×1 |
| infra/sandboxes (tests) | 6 | 1 | `ghcr.io/elie222/rakazo/computer` ×3, `ghcr.io/elie222/rakazo/computer:edge` ×3 |
| apps/api (tests) | 5 | 1 | `https://github.com/elie222/rakazo` ×3, `ghcr.io/elie222/rakazo/app` ×2 |
| .github/workflows | 3 | 2 | `inbox-zero/rakazo` ×2, `https://app.rakazo.com` ×1 |
| SECURITY.md | 3 | 1 | `security@rakazo.com` ×1, `support@rakazo.com` ×1, `elie@rakazo.com` ×1 |
| packages/core | 3 | 2 | `elie222/rakazo` ×1, `https://github.com/elie222/rakazo` ×1, `github.com/elie222/rakazo` ×1 |
| .env.example | 2 | 1 | `ghcr.io/elie222/rakazo/app` ×1, `ghcr.io/elie222/rakazo/updater` ×1 |
| SETUP_PROMPT.md | 2 | 1 | `https://raw.githubusercontent.com/elie222/rakazo/main/infra/compose/install-images.sh` ×1, `https://github.com/elie222/rakazo.git` ×1 |
| docs/mobile-release.md | 2 | 1 | `https://github.com/elie222/rakazo/releases/download/android/rakazo.apk` ×2 |
| packages/testkit (tests) | 2 | 2 | `https://github.com/elie222/rakazo/actions` ×1, `elie222/rakazo` ×1 |
| infra/railway | 1 | 1 | `https://railway.com/new/template/rakazo-template` ×1 |


## Internal (@rakazo/* packages, RAKAZO_* env, DB/Docker names, code identifiers, comments)

### In scope — 2224 hits

#### apps/mobile (tests) — 507 hits in 87 files

Top tokens: `rakazo.space_id` ×72, `rakazo.session_token` ×53, `x-rakazo-space-id` ×35, `@rakazo/contracts` ×24, `@rakazo/core` ×24, `rakazo.space_rollback` ×24, `@rakazo/ui-tokens` ×19, `com.rakazo.app` ×16, `RAKAZO_SCREENSHOT_BOT_ID` ×15, `RAKAZO_SCREENSHOT_EMAIL` ×13

#### apps/web (tests) — 449 hits in 162 files

Top tokens: `@rakazo.test` ×171, `@rakazo/contracts` ×42, `rakazoScreen` ×36, `@rakazo/ui-web` ×34, `rakazo:space-id` ×18, `@rakazo/core` ×16, `window.rakazoDesktop` ×11, `x-rakazo-space-id` ×11, `rakazoDesktop` ×10, `@rakazo/chat-ui/web` ×9

#### apps/web — 449 hits in 183 files

Top tokens: `@rakazo/contracts` ×125, `@rakazo/ui-web` ×92, `@rakazo/core` ×75, `rakazo-shared` ×15, `rakazo-web` ×11, `@rakazo/chat-ui/web` ×9, `rakazoScreen` ×9, `Rakazo` ×7, `data-rakazo-app-state` ×5, `RakazoDesktop` ×5

#### apps/mobile — 314 hits in 144 files

Top tokens: `@rakazo/contracts` ×83, `@rakazo/core` ×74, `rakazo` ×26, `@rakazo/ui-tokens` ×24, `x-rakazo-space-id` ×12, `com.rakazo.notifications` ×11, `@rakazo/chat-ui/native` ×8, `RakazoNotifications` ×3, `RakazoNetworkCache` ×3, `RakazoNotificationService.stop` ×3

#### packages/ui-web — 215 hits in 41 files

Top tokens: `@rakazo/ui-web/lib/utils` ×36, `.rakazo-organic-avatar` ×24, `.rakazo-organic-avatar-body-working` ×12, `.rakazo-bot-avatar` ×7, `@rakazo/ui-web/components/ui/button` ×6, `.rakazo-organic-avatar-eyes-working` ×6, `.rakazo-organic-avatar-eyes-idle` ×5, `@rakazo/core` ×4, `rakazo-bot-avatar` ×3, `rakazo-bot-avatar-ring` ×3

#### apps/desktop (tests) — 157 hits in 18 files

Top tokens: `https://rakazo.example.com` ×17, `RAKAZO_IMAGE_TAG` ×10, `RAKAZO_WEB_URL` ×10, `data-rakazo-app-state` ×8, `RAKAZO_CLOUD_URL` ×7, `RakazoDesktop` ×5, `rakazo-sso-oauth` ×5, `rakazo-model-oauth` ×5, `rakazo-web-1` ×4, `rakazo` ×4

#### apps/desktop — 81 hits in 20 files

Top tokens: `@rakazo/contracts` ×9, `Rakazo  (comment)` ×9, `RakazoDesktopOAuthCallback` ×4, `@rakazo/ui-tokens` ×3, `@rakazo/web` ×3, `isRakazoHealth` ×3, `RAKAZO_CLOUD_URL` ×3, `rakazo-sso-oauth` ×3, `data-rakazo-app-state` ×2, `@rakazo/contracts/local-settings` ×2

#### packages/ui-web (tests) — 27 hits in 3 files

Top tokens: `rakazo-organic-avatar` ×7, `rakazo-bot-avatar-visor` ×5, `rakazo-bot-avatar-eyes` ×4, `rakazo-bot-avatar-picture` ×3, `@rakazo/core` ×2, `rakazo-bot-avatar-ring` ×2, `.rakazo-organic-avatar-body-working` ×1, `rakazo-eyes-idle-` ×1, `rakazo-bot-avatar` ×1, `rakazo-bot-avatar-ring-working` ×1

#### packages/chat-ui — 14 hits in 8 files

Top tokens: `@rakazo/ui-tokens` ×6, `@rakazo/contracts` ×3, `@rakazo/ui-web` ×3, `@rakazo/chat-ui` ×1, `Rakazo  (comment)` ×1

#### packages/ui-tokens — 5 hits in 4 files

Top tokens: `@rakazo/ui-tokens` ×4, `rakazo.uiAppearance` ×1

#### packages/chat-ui (tests) — 3 hits in 3 files

Top tokens: `@rakazo/ui-tokens` ×3

#### packages/contracts — 3 hits in 1 files

Top tokens: `x-rakazo-client-build` ×1, `x-rakazo-build` ×1, `RAKAZO_MIN_CLIENT_BUILD` ×1

### Out of scope — 5137 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| packages/adapters (tests) | 867 | 167 | `@rakazo/adapter-kit` ×114, `@rakazo/db` ×50, `rakazo-push-` ×38 |
| packages/adapters | 654 | 188 | `@rakazo/adapter-kit` ×172, `@rakazo/contracts` ×83, `@rakazo/db` ×73 |
| infra/sandboxes (tests) | 522 | 13 | `rakazo-browser` ×55, `rakazo.botId` ×46, `rakazo.managed` ×33 |
| packages/testkit (tests) | 486 | 83 | `@rakazo.test` ×136, `@rakazo/adapters` ×39, `@rakazo/db` ×36 |
| infra/compose | 409 | 22 | `rakazo-c` ×38, `RAKAZO_DEPLOY_DIR:-/srv/rakazo` ×12, `POSTGRES_DB:-rakazo` ×12 |
| infra/sandboxes | 376 | 23 | `rakazo-browser` ×38, `rakazo-focus-or-launch` ×23, `/home/rakazo` ×19 |
| apps/api (tests) | 270 | 50 | `user@rakazo.test` ×54, `@rakazo/db` ×42, `@rakazo/contracts` ×30 |
| apps/api | 229 | 50 | `@rakazo/db` ×51, `@rakazo/contracts` ×42, `@rakazo/adapter-kit` ×29 |
| docs/self-host.md | 165 | 1 | `RAKAZO_DEPLOY_DIR` ×12, `/srv/rakazo` ×10, `rakazo` ×7 |
| apps/www | 160 | 23 | `rakazo` ×89, `row.rakazo` ×6, `/blog/openclaw-vs-hermes-vs-rakazo` ×5 |
| packages/core (tests) | 136 | 25 | `@rakazo/contracts` ×22, `RAKAZO_DESKTOP` ×13, `/tmp/rakazo` ×11 |
| infra/updater (tests) | 124 | 9 | `RAKAZO_IMAGE_TAG` ×19, `RAKAZO_DEPLOY_DIR` ×8, `RAKAZO_COMPOSE_FILE` ×8 |
| packages/core | 123 | 38 | `@rakazo/contracts` ×35, `/tmp/rakazo` ×7, `/tmp/rakazo/browser-profile-` ×4 |
| packages/db | 77 | 31 | `@rakazo/contracts` ×23, `rakazo_app` ×16, `@rakazo/core` ×14 |
| .github/workflows | 74 | 10 | `postgres://rakazo:rakazo` ×14, `@rakazo/desktop` ×10, `postgres://rakazo:rakazo@127.0.0.1:5433/rakazo` ×7 |
| pnpm-lock.yaml | 59 | 1 | `@rakazo/* (lockfile)` ×59 |
| .env.example | 50 | 1 | `rakazo` ×3, `RAKAZO_DEPLOY_DIR` ×3, `RAKAZO_COMPOSE_FILE` ×3 |
| packages/logging (tests) | 48 | 5 | `rakazo-api` ×35, `rakazo-worker` ×6, `rakazo-logs` ×3 |
| packages/db (tests) | 36 | 14 | `@rakazo/contracts` ×7, `@rakazo.test` ×5, `postgres://rakazo:rakazo` ×4 |
| infra/updater | 29 | 4 | `@rakazo/core` ×4, `@rakazo/logging` ×3, `@rakazo/updater` ×2 |
| docs/self-host-restricted-network.md | 24 | 1 | `RAKAZO_DOWNLOAD_BASE` ×4, `RAKAZO_INSTALLER_URL` ×3, `RAKAZO_DOWNLOAD_SKIP_EXISTING` ×2 |
| apps/worker | 21 | 3 | `@rakazo/adapters` ×4, `@rakazo/core` ×4, `@rakazo/adapter-kit` ×3 |
| packages/contracts | 16 | 7 | `Rakazo  (comment)` ×4, `RakazoDesktopUpdate` ×2, `RakazoDesktopOAuthCallback` ×2 |
| infra/systemd | 15 | 4 | `rakazo/alerts` ×3, `/var/lib/rakazo/alerts` ×3, `-/etc/rakazo/backup.env` ×2 |
| packages/auth | 14 | 5 | `@rakazo/db` ×4, `@rakazo/adapter-kit` ×3, `@rakazo/core` ×3 |
| packages/auth (tests) | 14 | 4 | `@rakazo/db` ×5, `https://rakazo.test/reset-password` ×2, `rakazo://sign-in` ×2 |
| README.md | 11 | 1 | `rakazo` ×3, `RAKAZO_DOWNLOAD_BASE` ×1, `RAKAZO_DOWNLOAD_SKIP_EXISTING` ×1 |
| infra/railway | 11 | 2 | `@rakazo/api` ×4, `@rakazo/worker` ×2, `@rakazo/web` ×2 |
| package.json | 10 | 1 | `@rakazo/db` ×3, `@rakazo/api` ×2, `rakazo` ×1 |
| SETUP_PROMPT.md | 9 | 1 | `rakazo_app` ×3, `RAKAZO_INSTALLER_URL` ×1, `https://example.com/mirror/rakazo/infra/compose/install-images.sh` ×1 |
| infra/compose (tests) | 8 | 1 | `rakazo` ×3, `/var/lib/rakazo/firewall-change` ×1, `/usr/local/sbin/rakazo-host-alert` ×1 |
| scripts/restore.sh | 8 | 1 | `rakazo` ×5, `rakazo_app` ×2, `SRC/rakazo.sql` ×1 |
| packages/logging | 7 | 4 | `@rakazo/logging` ×1, `rakazo-api` ×1, `rakazo-worker` ×1 |
| packages/memory | 7 | 2 | `@rakazo/adapter-kit` ×3, `@rakazo/db` ×3, `@rakazo/memory` ×1 |
| packages/contracts (tests) | 6 | 3 | `RAKAZO_TOKEN` ×2, `RAKAZO_CSP_SCRIPT_SRC` ×2, `rakazo-token` ×1 |
| CHANGELOG.md | 5 | 1 | `rakazo_app` ×1, `RAKAZO_OPENAI_COMPAT_PRIVATE_HOSTS` ×1, `RAKAZO_LOCAL_MODELS` ×1 |
| docs/content-encryption.md | 5 | 1 | `@rakazo/api` ×4, `@rakazo/adapter-kit` ×1 |
| docs/infisical-secrets.md | 5 | 1 | `@rakazo/api` ×4, `/rakazo` ×1 |
| docs/self-host-secrets.md | 5 | 1 | `rakazo` ×2, `rakazo_app` ×1, `RAKAZO_UPDATER_TOKEN` ×1 |
| packages/adapter-kit | 5 | 4 | `@rakazo/contracts` ×4, `@rakazo/adapter-kit` ×1 |
| packages/memory (tests) | 4 | 2 | `@rakazo/adapter-kit` ×2, `@rakazo/db` ×2 |
| scripts/backup.sh | 4 | 1 | `rakazo` ×2, `OUT/rakazo.sql` ×1, `RAKAZO_BACKUP_SKIP_HOMES:-0` ×1 |
| docs/bot-secrets.md | 3 | 1 | `RAKAZO_SECRETS_ALLOW_PRIVATE_HTTP` ×2, `RAKAZO_` ×1 |
| docs/computer-runtime.md | 3 | 1 | `rakazo` ×1, `/home/user/rakazo-home` ×1, `RAKAZO_COMPUTER_IMAGE` ×1 |
| docs/self-host-sandbox-providers.md | 3 | 1 | `RAKAZO_COMPUTER_IMAGE` ×1, `RAKAZO_COMPUTER_IMAGE_TAG` ×1, `rakazo-computer` ×1 |
| turbo.json | 3 | 1 | `RAKAZO_HOST` ×1, `RAKAZO_DEV_HOST` ×1, `RAKAZO_ALLOWED_HOSTS` ×1 |
| .github/scripts | 2 | 1 | `/rakazo-mobile-screenshots.log` ×1, `/rakazo-mobile-android.log` ×1 |
| AGENTS.md | 2 | 1 | `@rakazo/desktop` ×1, `@rakazo/ui-tokens` ×1 |
| CONTRIBUTING.md | 2 | 1 | `@rakazo/web` ×2 |
| apps/www (tests) | 2 | 1 | `process.env.RAKAZO_GITHUB_API` ×2 |
| docs/agent-verification.md | 2 | 1 | `rakazo/computer:local` ×2 |
| .agents/skills | 1 | 1 | `rakazo-playwright-screenshots` ×1 |
| .agents/skills (tests) | 1 | 1 | `rakazo-playwright-screenshots` ×1 |
| .gitattributes | 1 | 1 | `infra/sandboxes/computer/rakazo-browser` ×1 |
| apps/worker (tests) | 1 | 1 | `@rakazo/adapters` ×1 |
| docs/mobile-release.md | 1 | 1 | `@rakazo/mobile` ×1 |
| docs/tool-activity.md | 1 | 1 | `rakazo.showToolActivity` ×1 |
| scripts/build-server.mjs | 1 | 1 | `@rakazo` ×1 |


## Tracked paths whose file or directory name contains "rakazo" (33 files)

| Path | Scope | Treatment |
|---|---|---|
| `packages/ui-tokens/assets/Rakazo.icon/**` (2 files) | in scope (icon source) | replaced by `Nurlings.icon` placeholder bundle; Rakazo mascot not used |
| `apps/mobile/modules/rakazo-notifications/**` (13), `apps/mobile/modules/rakazo-network-cache/**` (4) | in scope, internal | kept (native module identifiers; no visible text) |
| `apps/www/public/brand/rakazo-mark.png`, `apps/www/public/og/blog-openclaw-vs-hermes-vs-rakazo.png`, `apps/www/src/content/blog/openclaw-vs-hermes-vs-rakazo.md` | out of scope (`apps/www`) | kept |
| `infra/sandboxes/computer/rakazo-*` (5), `infra/systemd/rakazo-*` (6) | out of scope | kept |
