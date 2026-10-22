# Proposal: White-label Nurlings for dedicated client servers

## Why

Nurlings will be deployed for our clients, each on their **own dedicated server**. A client sees
three apps (web, desktop, mobile) and the text their server produces (emails, chat messages,
settings blurbs), and the operator pulls images and upgrades the server. All of that must read
Nurlings, by Nurturist AI, with no trace of Rakazo, and a client server must not be able to turn
itself back into Rakazo. The rest of the backend (database, internals, telemetry wiring) stays as
upstream ships it so we can keep merging Rakazo updates.

## Scope

| In scope | Out of scope |
|---|---|
| **Web app**: every visible "Rakazo", page titles, sign-in headings, sidebar, favicon, logo/wordmark, "Powered by Nurturist AI" line | API/server code beyond the items on the left, auth origins (`rakazo://` is kept) |
| **Desktop (Electron)**: visible text, app display name, window title, icons, About screen (upstream has no tray; none added) | Model-facing prompts ("You are a Rakazo bot…") |
| **Mobile (Expo)**: visible text, display name, icons, splash; **bundle id / Android package → `com.nurturistai.nurlings`** | Bot User-Agent |
| **Visible links** in those UIs → https://nurlings.nurturistai.com; Rakazo Discord/GitHub/cloud links removed | `apps/www` marketing site |
| **Desktop setup**: remove the option to sign in to Rakazo's hosted cloud | Telemetry (already env-gated; left alone) |
| **Disable** desktop auto-updater and mobile OTA (no re-pointing) | Internal identifiers: `@rakazo/*`, `RAKAZO_*`, DB names |
| **Central brand config** feeding all of the above | README, `docs/`, issue templates, `SECURITY.md` (left as-is) |
| **LICENSE** kept; **NOTICE** with Rakazo credit | Provider-console names (OAuth/Slack/etc.) — listed as manual steps |
| *(added)* **Disable server self-update** (just disable, no re-pointing) | |
| *(added)* **Our own images**: a GitHub Actions workflow builds the images from this repo and pushes them to private GHCR; compose files and installer pull ours; documented client authentication | |
| *(added)* **Server text clients see**: account emails, chat-channel messages, update messages, model/billing blurbs, OAuth client name — text only, from the brand config | |
| *(added)* **Minimal API support for the new bundle id**: Android package in `assetlinks.json`; allowed origins unchanged | |

Decisions you made (recorded in `design.md`): (1) UI copy says **Nurling / Nurlings** instead of
bot/bots; (2) `apps/www` out; (3) bundle id and Android package → `com.nurturistai.nurlings`,
`rakazo://` scheme kept; (4) README/docs/templates/`SECURITY.md` left as-is; (5) EAS: Rakazo's
Expo owner and project id removed, clear placeholders left; (6) docs/privacy links → site root.

## What Changes

- **Central brand config** (new leaf package `packages/brand`): name, bot singular/plural,
  "Powered by Nurturist AI" tagline, company, site URL, bundle id, image registry prefix, theme
  colours, logo/icon paths, and feature flags (desktop updater, mobile OTA, server self-update all
  off). Everything below reads it.
- **Web**: Lingui catalogs (12 locales) are rebranded when loaded, which also rewrites English
  "bot(s)" to "Nurling(s)"; `.po` files stay identical to upstream. ~20 source files with hardcoded
  text/links read the config. Page title, manifest and favicons come from the config/assets.
- **Desktop**: display name, window title, setup window, menus, dialogs, About panel with the
  tagline, icons; hosted-cloud choice removed; auto-updater off.
- **Mobile**: display name, permission prompts, icons, splash via `app.config.ts`; iOS bundle id
  and Android package set to `com.nurturistai.nurlings`; OTA off; `owner` and EAS `projectId`
  in `app.json` replaced by clear placeholders; `rakazo://` scheme untouched.
- **Server self-update off**: the API refuses updates and the Settings section stays hidden; the
  opt-in updater sidecar is never started. Clients are upgraded by us publishing a new image tag.
- **Server text** (text only): the four account emails (verify, sign-in code, password reset,
  account deletion), passkey/app name, chat-channel messages (group intro, "linked to your …
  agent", "Open … for details"), update messages, model/billing blurbs, MCP OAuth client name.
  (There is no invite *email*: invites are chat-channel messages, covered above.)
- **Images**: new workflow `publish-nurlings-images.yml` builds `app`, `computer` and `updater` from
  this repo and pushes them to `ghcr.io/<owner>/nurlings/<name>` (private); upstream's publish
  workflow is guarded to run only in Rakazo's repo; compose defaults, `.env.images.example` and the
  installer default to our images; the installer can log in to GHCR; new
  `docs/nurlings-deployment.md` documents authentication.
- **Bundle id support in the API**: `ANDROID_PACKAGE` (used for `/.well-known/assetlinks.json`)
  comes from the brand config. iOS passkeys need no code change: `PASSKEY_APPLE_APP_IDS` is a
  deployment env var.
- **License**: `LICENSE` untouched; new `NOTICE` crediting Rakazo by Elie Steinbock.
- **Guardrail**: `brand:check` fails on a visible "Rakazo" in catalogs/generated identity, a compose
  image default that differs from the configured registry, a Rakazo update feed, or a changed
  `LICENSE`.

## Capabilities

### New Capabilities
- `brand-config`: single source of truth for brand values and how each surface consumes it.
- `user-facing-branding`: all text people read — in the three UIs and in server-generated email,
  chat, update and settings text — says Nurlings / Nurling(s).
- `app-identity`: display names, titles, icons, splash, placeholders; native bundle id/package and
  the identifiers that stay unchanged; EAS placeholders.
- `external-links`: visible links, removed Rakazo-hosted entries, and every updater disabled
  (desktop, mobile OTA, server self-update).
- `image-distribution`: our images built from this repo into private GHCR, compose/installer
  defaults, and documented client authentication.
- `license-attribution`: Apache-2.0 compliance — `LICENSE` untouched, `NOTICE` with credit.

### Modified Capabilities
None — `openspec/specs/` is empty; these specs are created by archiving this change.

## Impact

- **Code to edit** (inventory below): 29 source files carry user-facing text (UI + server),
  8 display-name/identity, 10 visible links/registry references, ≈33 test files assert the old
  text. 23 locale/translation files carry the name but are **not edited** (the load-time seam
  handles them). New additive pieces: `packages/brand`, `NOTICE`, assets, the image workflow, the
  deployment doc, the guard.
- **Dependencies**: `@nurlings/brand` becomes a workspace dependency of web, mobile, desktop,
  `ui-web`, `contracts`, `auth`, `api`, `adapters`, `core` (leaf package, no cycles).
- **Build/CI**: new workflow; upstream's publish workflow gets a repository guard (and its
  structural test is updated); mobile `app.json` loses Rakazo's owner/project id.
- **Upstream merges**: only 507 of 8,696 occurrences (6%) are in scope and not internal; edits to
  upstream files are small and mechanical.

## What stays as-is on purpose

| Kept | Why |
|---|---|
| **`rakazo://` URL scheme**, Expo `slug`, desktop `appId` `dev.rakazo.desktop`, Linux `executableName` | Not needed for the bundle-id change (see below); keeps auth origins untouched |
| `@rakazo/*` packages (≈2,300 references), `RAKAZO_*` env vars (incl. `RAKAZO_IMAGE`, `RAKAZO_DOWNLOAD_BASE`), `x-rakazo-*` headers, DB/Docker/systemd names, storage keys (`rakazo.*`), native module names, TS identifiers | Internal; renaming makes every upstream merge huge |
| `OFFICIAL_REPO_URL`, `PUBLISHED_IMAGE_REPO`, updater sidecar logic | Self-update is disabled, not re-pointed; the code is unreachable |
| Model prompts, bot User-Agent, internal error messages (`throw new Error(…)`), `apps/www`, README/docs, telemetry wiring | Out of scope |

Rule of thumb: **if a client or their users can read it in an app, an email, a chat message or a
settings screen, it is branded; if only code or an operator log can, it stays.**

### Does the bundle-id change force the URL scheme to change?

**No.** Verified in the code: the scheme is its own field (`scheme: "rakazo"`), and nothing derives
it from the bundle id. The API's trusted mobile origins are scheme-based (`rakazo://` in
`MOBILE_AUTH_ORIGINS` and `isTrustedOrigin`), so **allowed origins need no change**. The only
bundle-id-dependent API code is `ANDROID_PACKAGE` in `apps/api/src/app-association.ts` (the
Android passkey `assetlinks.json`); iOS passkey association comes from the
`PASSKEY_APPLE_APP_IDS` env var (`<TeamID>.com.nurturistai.nurlings`), set per server.

## Things you should know

1. **The repo is moving to an organization; the registry prefix is a placeholder until then.**
   `hamza-at-nurturist` is a personal account, so the repo is being transferred. `brand.json` holds
   `registry: "ghcr.io/REPLACE_WITH_ORG/nurlings"` (the only uppercase value the validator accepts)
   and `pnpm brand:check --release` fails until it names a real, **lowercase** organization. Every
   image name and registry path is lowercase everywhere (the workflow also lowercases the owner and
   repository name it derives), so the mixed-case `Nurlings` repo name can never produce an invalid
   image reference. The org name is supplied before group 7; once the repo moves, remotes, workflow
   references and the registry value are fixed up (task 7.6). GHCR pulls use a personal access
   token (classic, `read:packages`) of a GitHub user with read access to the packages; an org
   makes per-client machine users and package access manageable.
2. **Private repo constraints on the pipeline.** (a) Clients are served the **install kit**
   (installer + compose + env example, delivered directly), so they need no access to the private
   repo; `NURLINGS_DOWNLOAD_TOKEN` stays as an optional fallback for `raw.githubusercontent.com`
   downloads. (b) Client servers are x86, so the workflow builds **amd64 only** and omits
   build-provenance attestations (upstream's arm64 runner and attestation steps are not carried
   over). (c) GHCR packages first published from a private repo should be private by default
   (verify on the first run).
3. **Self-update off means upgrades are ours to roll out.** Clients upgrade by us publishing a new
   tag and an operator running `docker compose pull && up -d` (documented).
4. **Bundle-id manual steps** (not code): register the App ID and create the app in App Store
   Connect / Play Console under our accounts; add `<TeamID>.com.nurturistai.nurlings` to
   `PASSKEY_APPLE_APP_IDS` and our signing-cert SHA-256 to `PASSKEY_ANDROID_CERT_SHA256` on each
   server; supply a `google-services.json` (FCM) for the new package if push is used (mobile push also stays inert until the Expo project id is set; with Rakazo's id baked in, tokens would have been minted under Rakazo's Expo project); create the
   Expo project and fill the `owner` / `projectId` placeholders.
5. **Names configured outside the repo (manual list)** — these appear on third-party screens and
   are set in each provider's console/account, not in code: `EMAIL_FROM` display name (SMTP/
   Resend/SES); Slack app name and bot display name; Telegram bot name (BotFather); WhatsApp
   Business display name; Pipedream Connect project and Composio app/auth-config names (shown on
   app-connection consent screens); the client's OIDC provider app name, if they use SSO; Stripe
   product/checkout branding, if billing is enabled. Subscription sign-ins for ChatGPT/Copilot/xAI
   use those providers' own client names (not ours). MCP servers see the name sent at registration,
   which this change rebrands in code.
6. **Still says Rakazo after this change** (out of scope): model prompts, bot User-Agent, internal
   error messages that only logs/operators see (e.g. secrets-guard, `throw new Error(…)` strings),
   README/docs/issue templates, `apps/www`. Also present but unreachable: `@rakazo/core`'s
   `OFFICIAL_REPO_URL` string ships inside the mobile bundle (Metro does not tree-shake the
   package barrel) although no app code calls the self-update helpers; the final guard allows
   exactly that one string.

## Placeholder assets and the sizes each platform needs

Placeholders live in **one folder**, `packages/brand/assets/`, with names that say what they are;
a new generator (`export:assets`) derives every platform size from them, upstream's `ui-tokens`
`export:brand` command delegates to it, and nothing is written into `apps/www`. Drop real artwork over the files
marked **source**; do not hand-edit generated files.

| Surface | File(s) the app uses | Size / format | Source asset |
|---|---|---|---|
| macOS (Electron) | `Nurlings.icon` bundle (Icon Composer; compiled by electron-builder, Xcode 26+) | 1024×1024 PNG layer | `app-icon/Nurlings.icon` |
| Windows (Electron) | `icon.ico` | frames 16, 32, 48, 64, 128, 256 | `app-icon/app-icon-1024.png` |
| Linux (Electron) | `icon.png` | 1024×1024 (≥512 required) | `app-icon/app-icon-1024.png` |
| Tray (Electron) | — upstream has no tray; none added | — | — |
| iOS | `Nurlings.icon` bundle (Expo `ios.icon`); App Store icon | 1024×1024; **no alpha** for the store copy | `app-icon/Nurlings.icon` |
| Android launcher | `icon.png`; adaptive `foreground`, `background`, `monochrome` | 1024×1024 each; adaptive art inside the central 66% safe zone | `android/*` |
| Android notification | `notification-icon.png` | 72×72 white-on-alpha silhouette | `android/notification-72.png` |
| Android store (manual) | Play hi-res icon / feature graphic | 512×512 / 1024×500 | `app-icon`, `social` |
| Mobile splash | `splash-icon.png` (+ bg `#FCFCFC` light / `#141414` dark from brand colours) | 1024×1024 transparent, art ≈620px centred | `splash/splash-icon-1024.png` |
| Mobile web | `favicon.png` | 128×128 | `favicon/favicon-128.png` |
| Web app (`apps/web/public`) | `favicon.ico` (16, 32, 48), `favicon-16x16`, `favicon-32x32`, `favicon.png` 128, `apple-touch-icon` 180, `icon-192`, `icon-512`, manifest icons | as listed | `app-icon/app-icon-1024.png` |
| In-app wordmark | `Wordmark` component in `packages/ui-web` (CSS face + name today) | SVG/CSS; reads brand name | `logo/nurlings-wordmark.svg` |

The Rakazo orange-bot mascot and `rakazo-mark.png` are not reused anywhere in our branding.

## Gate

Approved with the changes above. Implementation proceeds with group 1 (brand package).

---

# Appendix A — Occurrence inventory ("rakazo", case-insensitive)

Generated from `git grep -nIi rakazo` on `main` (= upstream `46eeb1c2`), excluding `openspec/`,
classified by [`inventory.py`](./inventory.py) in this change folder (re-runnable; also used for
the final "what remains" check). Classification is rule-based (path + context + token shape), so
a handful of lines may be filed one group off; the final grep pass re-checks every remaining
occurrence by hand. **Line-level** listings of the in-scope user-facing / identity / link
occurrences are in [`inventory-lines.md`](./inventory-lines.md) (locale catalogs list the English
file only — the other 11 locales repeat the same message IDs). Internal occurrences are summarised
per area with their top tokens, not per line. Some in-scope lines are listed for context but
deliberately not changed: internal `throw new Error(…)` strings in `team-chat-bridge.ts` and the
repo-matching constants/tests in `self-update.ts` (self-update is disabled, not re-pointed).


Total occurrences in tracked text files: **8696** in **1565** files.

| Group | In scope: hits (files) | Out of scope: hits (files) |
|---|---:|---:|
| user-facing | 438 (80) | 552 (108) |
| app-identity | 26 (8) | 20 (7) |
| external-links | 43 (15) | 256 (52) |
| internal | 2477 (696) | 4884 (803) |

**In scope** = (a) customer-facing UI: `apps/web`, `apps/desktop`, `apps/mobile`, `packages/ui-web`, `packages/chat-ui`, `packages/ui-tokens`, and three shared UI constants in `packages/contracts`; (b) the dedicated-server files listed in `SERVER_SCOPE_FILES` in `inventory.py` (account emails, chat-channel text, update messages, model/billing blurbs, OAuth client name, Android package for passkeys, compose files, installer, image workflow). **Out of scope** = everything else (rest of API/server, adapters, core, infra, CI, docs, `apps/www`, root docs, test kit). Out-of-scope hits are kept as-is.

## User-facing (UI text, page titles, sign-in headings, onboarding, errors, docs shown to users)

### In scope — 438 hits

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

#### packages/auth — 14 hits in 2 files

- `packages/auth/src/index.ts` (11)
- `packages/auth/src/account-security.ts` (3)

#### apps/web (tests) — 13 hits in 7 files

- `apps/web/e2e/auth-lifecycle.spec.ts` (6)
- `apps/web/e2e/fixtures/marketing-shots.tsx` (2)
- `apps/web/e2e/helpers.ts` (1)
- `apps/web/e2e/model-settings.spec.ts` (1)
- `apps/web/e2e/settings-shell.spec.ts` (1)
- `apps/web/src/novnc-html.test.ts` (1)
- `apps/web/src/pages/ModelSettingsOverlay.test.tsx` (1)

#### packages/adapters — 9 hits in 3 files

- `packages/adapters/src/pi-models.ts` (5)
- `packages/adapters/src/pi-oauth.ts` (3)
- `packages/adapters/src/mcp-oauth.ts` (1)

#### apps/api — 7 hits in 2 files

- `apps/api/src/team-chat-bridge.ts` (5)
- `apps/api/src/messaging-inbound.ts` (2)

#### infra/compose — 4 hits in 1 files

- `infra/compose/install-images.sh` (4)

#### packages/adapters (tests) — 3 hits in 2 files

- `packages/adapters/src/pi-models.test.ts` (2)
- `packages/adapters/src/mcp-oauth.test.ts` (1)

#### packages/auth (tests) — 2 hits in 1 files

- `packages/auth/src/index.test.ts` (2)

#### packages/core — 2 hits in 1 files

- `packages/core/src/self-update.ts` (2)

#### packages/contracts — 1 hits in 1 files

- `packages/contracts/src/openai-compatible-ui.ts` (1)

#### packages/ui-web — 1 hits in 1 files

- `packages/ui-web/src/bot-avatar.tsx` (1)

### Out of scope — 552 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| apps/www | 381 | 41 | `Rakazo` ×380, `Rakazo-Startseite` ×1 |
| docs/self-host.md | 25 | 1 | `Rakazo` ×25 |
| packages/testkit (tests) | 19 | 7 | `Rakazo` ×18, `Contents/MacOS/Rakazo` ×1 |
| packages/adapters (tests) | 17 | 11 | `Rakazo` ×14, `Rakazo-owned` ×3 |
| README.md | 14 | 1 | `Rakazo` ×14 |
| packages/adapters | 14 | 9 | `Rakazo` ×11, `Rakazo-owned` ×3 |
| docs/computer-runtime.md | 9 | 1 | `Rakazo` ×6, `Rakazo-owned` ×3 |
| infra/railway | 9 | 1 | `Rakazo` ×9 |
| infra/compose | 8 | 4 | `Rakazo` ×8 |
| SETUP_PROMPT.md | 7 | 1 | `Rakazo` ×7 |
| .github/ISSUE_TEMPLATE | 5 | 3 | `Rakazo` ×5 |
| VISION.md | 5 | 1 | `Rakazo` ×5 |
| infra/sandboxes | 5 | 4 | `Rakazo` ×5 |
| apps/www (tests) | 4 | 2 | `Rakazo` ×4 |
| .github/workflows | 3 | 3 | `out/mac-arm64/Rakazo.app/Contents/MacOS/Rakazo` ×1, `Rakazo` ×1, `app/Contents/MacOS/Rakazo` ×1 |
| CHANGELOG.md | 3 | 1 | `Rakazo` ×3 |
| docs/mobile-release.md | 3 | 1 | `Rakazo` ×3 |
| packages/auth (tests) | 3 | 1 | `Rakazo` ×3 |
| CONTRIBUTING.md | 2 | 1 | `Rakazo` ×2 |
| apps/api (tests) | 2 | 1 | `Rakazo` ×2 |
| docs/agent-verification.md | 2 | 1 | `Rakazo` ×2 |
| infra/systemd | 2 | 2 | `Rakazo` ×2 |
| packages/core | 2 | 2 | `d:Rakazo` ×1, `Rakazo` ×1 |
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

### In scope — 43 hits

#### infra/compose — 26 hits in 5 files

- `infra/compose/docker-compose.images.yml` (12)
- `infra/compose/docker-compose.prod.yml` (9)
- `infra/compose/.env.images.example` (2)
- `infra/compose/docker-compose.prod.docker.yml` (2)
- `infra/compose/install-images.sh` (1)

#### infra/updater (tests) — 5 hits in 2 files

- `infra/updater/src/compose-images.test.ts` (3)
- `infra/updater/src/compose-service.test.ts` (2)

#### packages/contracts — 4 hits in 2 files

- `packages/contracts/src/client-build.ts` (3)
- `packages/contracts/src/ai-consent.ts` (1)

#### apps/desktop (tests) — 2 hits in 2 files

- `apps/desktop/src/local-stack.test.ts` (1)
- `apps/desktop/src/window-open.test.ts` (1)

#### apps/web (tests) — 2 hits in 1 files

- `apps/web/src/components/SidebarFooter.test.tsx` (2)

#### packages/core — 2 hits in 1 files

- `packages/core/src/self-update.ts` (2)

#### apps/desktop — 1 hits in 1 files

- `apps/desktop/src/setup-config.ts` (1)

#### apps/web — 1 hits in 1 files

- `apps/web/src/components/SidebarFooter.tsx` (1)

### Out of scope — 256 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| apps/www | 120 | 17 | `hello@rakazo.com` ×11, `https://rakazo.com/self-hosted-ai-agent` ×10, `https://github.com/elie222/rakazo/blob/main/docs/self-host.md` ×9 |
| README.md | 22 | 1 | `https://github.com/elie222/rakazo/releases/download/android/rakazo.apk` ×4, `https://apps.apple.com/app/rakazo/id6801531099` ×2, `https://img.shields.io/github/stars/elie222/rakazo` ×1 |
| apps/www (tests) | 17 | 3 | `https://rakazo.com` ×5, `https://github.com/elie222/rakazo/releases/download/v2.0.0/Rakazo-2.0.0-universal.dmg` ×2, `www.rakazo.com` ×2 |
| packages/adapters (tests) | 13 | 5 | `elie222/rakazo` ×6, `http://localhost:6767/v3/container-tags/rakazo` ×3, `Rakazo/0.1` ×2 |
| packages/core (tests) | 13 | 2 | `https://github.com/elie222/rakazo.git` ×3, `https://github.com/elie222/rakazo` ×2, `https://git.example.com:8443/team/rakazo.git` ×2 |
| .github/ISSUE_TEMPLATE | 11 | 3 | `security@rakazo.com` ×3, `https://github.com/elie222/rakazo/blob/main/SECURITY.md` ×3, `mailto:security@rakazo.com` ×2 |
| packages/adapters | 11 | 5 | `Rakazo/0.1` ×4, `https://github.com/elie222/rakazo` ×4, `https://github.com/elie222/rakazo/releases/tag/v0.4.2` ×1 |
| docs/self-host.md | 8 | 1 | `ghcr.io/elie222/rakazo/computer` ×3, `ghcr.io/elie222/rakazo/app` ×2, `https://raw.githubusercontent.com/elie222/rakazo/main/infra/compose/install-images.sh` ×1 |
| CONTRIBUTING.md | 6 | 1 | `security@rakazo.com` ×1, `mailto:security@rakazo.com` ×1, `support@rakazo.com` ×1 |
| infra/sandboxes (tests) | 6 | 1 | `ghcr.io/elie222/rakazo/computer` ×3, `ghcr.io/elie222/rakazo/computer:edge` ×3 |
| infra/updater (tests) | 6 | 1 | `https://github.com/elie222/rakazo` ×6 |
| apps/api (tests) | 5 | 1 | `https://github.com/elie222/rakazo` ×3, `ghcr.io/elie222/rakazo/app` ×2 |
| .github/workflows | 3 | 2 | `inbox-zero/rakazo` ×2, `https://app.rakazo.com` ×1 |
| SECURITY.md | 3 | 1 | `security@rakazo.com` ×1, `support@rakazo.com` ×1, `elie@rakazo.com` ×1 |
| .env.example | 2 | 1 | `ghcr.io/elie222/rakazo/app` ×1, `ghcr.io/elie222/rakazo/updater` ×1 |
| SETUP_PROMPT.md | 2 | 1 | `https://raw.githubusercontent.com/elie222/rakazo/main/infra/compose/install-images.sh` ×1, `https://github.com/elie222/rakazo.git` ×1 |
| docs/mobile-release.md | 2 | 1 | `https://github.com/elie222/rakazo/releases/download/android/rakazo.apk` ×2 |
| infra/compose | 2 | 1 | `RAKAZO_HOST:app.example.com` ×2 |
| packages/testkit (tests) | 2 | 2 | `https://github.com/elie222/rakazo/actions` ×1, `elie222/rakazo` ×1 |
| infra/railway | 1 | 1 | `https://railway.com/new/template/rakazo-template` ×1 |
| packages/core | 1 | 1 | `elie222/rakazo` ×1 |


## Internal (@rakazo/* packages, RAKAZO_* env, DB/Docker names, code identifiers, comments)

### In scope — 2477 hits

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

#### infra/compose — 169 hits in 5 files

Top tokens: `RAKAZO_IMAGE:-ghcr.io/elie222/rakazo/app` ×9, `POSTGRES_DB:-rakazo` ×8, `RAKAZO_HOST` ×6, `POSTGRES_USER:-rakazo` ×6, `RAKAZO_DEPLOY_DIR:-/srv/rakazo` ×6, `RAKAZO_IMAGE_TAG` ×5, `RAKAZO_COMPUTER_IMAGE:-rakazo/computer` ×4, `rakazo` ×3, `RAKAZO_CSP_SCRIPT_SRC` ×3, `RAKAZO_CSP_CONNECT_SRC` ×3

#### apps/desktop (tests) — 157 hits in 18 files

Top tokens: `https://rakazo.example.com` ×17, `RAKAZO_IMAGE_TAG` ×10, `RAKAZO_WEB_URL` ×10, `data-rakazo-app-state` ×8, `RAKAZO_CLOUD_URL` ×7, `RakazoDesktop` ×5, `rakazo-sso-oauth` ×5, `rakazo-model-oauth` ×5, `rakazo-web-1` ×4, `rakazo` ×4

#### apps/desktop — 81 hits in 20 files

Top tokens: `@rakazo/contracts` ×9, `Rakazo  (comment)` ×9, `RakazoDesktopOAuthCallback` ×4, `@rakazo/ui-tokens` ×3, `@rakazo/web` ×3, `isRakazoHealth` ×3, `RAKAZO_CLOUD_URL` ×3, `rakazo-sso-oauth` ×3, `data-rakazo-app-state` ×2, `@rakazo/contracts/local-settings` ×2

#### packages/ui-web (tests) — 27 hits in 3 files

Top tokens: `rakazo-organic-avatar` ×7, `rakazo-bot-avatar-visor` ×5, `rakazo-bot-avatar-eyes` ×4, `rakazo-bot-avatar-picture` ×3, `@rakazo/core` ×2, `rakazo-bot-avatar-ring` ×2, `.rakazo-organic-avatar-body-working` ×1, `rakazo-eyes-idle-` ×1, `rakazo-bot-avatar` ×1, `rakazo-bot-avatar-ring-working` ×1

#### infra/updater (tests) — 20 hits in 2 files

Top tokens: `RAKAZO_IMAGE_TAG` ×2, `RAKAZO_DEPLOY_DIR:-/srv/rakazo` ×2, `/rakazo` ×1, `RAKAZO_COMPUTER_IMAGE_TAG` ×1, `RAKAZO_WEB_PORT:-5173` ×1, `RAKAZO_API_PORT:-3100` ×1, `@rakazo/core` ×1, `RAKAZO_DEPLOY_DIR` ×1, `.RAKAZO_DEPLOY_DIR` ×1, `RAKAZO_UPDATER_IMAGE_TAG` ×1

#### apps/api — 16 hits in 3 files

Top tokens: `@rakazo/adapter-kit` ×4, `@rakazo/contracts` ×3, `@rakazo/db` ×3, `@rakazo/core` ×2, `@rakazo/logging` ×2, `Rakazo  (comment)` ×1, `com.rakazo.app` ×1

#### packages/adapters — 15 hits in 3 files

Top tokens: `@rakazo/contracts` ×5, `@rakazo/adapter-kit` ×3, `@rakazo/db` ×3, `@rakazo/logging` ×2, `@rakazo/core` ×1, `rakazo-oauth` ×1

#### packages/chat-ui — 14 hits in 8 files

Top tokens: `@rakazo/ui-tokens` ×6, `@rakazo/contracts` ×3, `@rakazo/ui-web` ×3, `@rakazo/chat-ui` ×1, `Rakazo  (comment)` ×1

#### packages/adapters (tests) — 10 hits in 3 files

Top tokens: `process.env.RAKAZO_OPENAI_COMPAT_ALLOW_PUBLIC` ×4, `rakazo-test/unknown-future-model` ×3, `@rakazo/logging` ×1, `@rakazo/adapter-kit` ×1, `@rakazo/db` ×1

#### apps/api (tests) — 8 hits in 2 files

Top tokens: `postgres://rakazo:rakazo` ×2, `postgres://rakazo:rakazo@127.0.0.1:5433/rakazo` ×1, `com.rakazo.app` ×1, `@rakazo/adapter-kit` ×1, `@rakazo/contracts` ×1, `@rakazo/core` ×1, `@rakazo/db` ×1

#### packages/auth — 8 hits in 2 files

Top tokens: `@rakazo/adapter-kit` ×2, `@rakazo/db` ×2, `@rakazo/core` ×1, `Rakazo  (comment)` ×1, `x-rakazo-client-ip` ×1, `rakazo` ×1

#### packages/core — 5 hits in 1 files

Top tokens: `@rakazo/db` ×2, `Rakazo  (comment)` ×1, `@rakazo/web` ×1, `RAKAZO_UPDATE_RESTART_SUPERVISOR` ×1

#### packages/ui-tokens — 5 hits in 4 files

Top tokens: `@rakazo/ui-tokens` ×4, `rakazo.uiAppearance` ×1

#### packages/chat-ui (tests) — 3 hits in 3 files

Top tokens: `@rakazo/ui-tokens` ×3

#### packages/contracts — 3 hits in 1 files

Top tokens: `x-rakazo-client-build` ×1, `x-rakazo-build` ×1, `RAKAZO_MIN_CLIENT_BUILD` ×1

#### packages/auth (tests) — 2 hits in 1 files

Top tokens: `https://rakazo.test/reset-password` ×2

### Out of scope — 4884 hits (left as-is)

| Area | Hits | Files | Top tokens |
|---|---:|---:|---|
| packages/adapters (tests) | 857 | 164 | `@rakazo/adapter-kit` ×113, `@rakazo/db` ×49, `rakazo-push-` ×38 |
| packages/adapters | 639 | 185 | `@rakazo/adapter-kit` ×169, `@rakazo/contracts` ×78, `@rakazo/db` ×70 |
| infra/sandboxes (tests) | 522 | 13 | `rakazo-browser` ×55, `rakazo.botId` ×46, `rakazo.managed` ×33 |
| packages/testkit (tests) | 486 | 83 | `@rakazo.test` ×136, `@rakazo/adapters` ×39, `@rakazo/db` ×36 |
| infra/sandboxes | 376 | 23 | `rakazo-browser` ×38, `rakazo-focus-or-launch` ×23, `/home/rakazo` ×19 |
| apps/api (tests) | 262 | 48 | `user@rakazo.test` ×54, `@rakazo/db` ×41, `@rakazo/contracts` ×29 |
| infra/compose | 240 | 17 | `rakazo-c` ×38, `RAKAZO_IPTABLES` ×9, `RAKAZO_IP6TABLES` ×9 |
| apps/api | 213 | 47 | `@rakazo/db` ×48, `@rakazo/contracts` ×39, `@rakazo/adapter-kit` ×25 |
| docs/self-host.md | 165 | 1 | `RAKAZO_DEPLOY_DIR` ×12, `/srv/rakazo` ×10, `rakazo` ×7 |
| apps/www | 160 | 23 | `rakazo` ×89, `row.rakazo` ×6, `/blog/openclaw-vs-hermes-vs-rakazo` ×5 |
| packages/core (tests) | 136 | 25 | `@rakazo/contracts` ×22, `RAKAZO_DESKTOP` ×13, `/tmp/rakazo` ×11 |
| packages/core | 118 | 37 | `@rakazo/contracts` ×35, `/tmp/rakazo` ×7, `/tmp/rakazo/browser-profile-` ×4 |
| infra/updater (tests) | 104 | 7 | `RAKAZO_IMAGE_TAG` ×17, `RAKAZO_UPDATER_TOKEN` ×7, `RAKAZO_DEPLOY_DIR` ×7 |
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
| packages/auth (tests) | 12 | 3 | `@rakazo/db` ×5, `rakazo://sign-in` ×2, `rakazo` ×2 |
| README.md | 11 | 1 | `rakazo` ×3, `RAKAZO_DOWNLOAD_BASE` ×1, `RAKAZO_DOWNLOAD_SKIP_EXISTING` ×1 |
| infra/railway | 11 | 2 | `@rakazo/api` ×4, `@rakazo/worker` ×2, `@rakazo/web` ×2 |
| package.json | 10 | 1 | `@rakazo/db` ×3, `@rakazo/api` ×2, `rakazo` ×1 |
| SETUP_PROMPT.md | 9 | 1 | `rakazo_app` ×3, `RAKAZO_INSTALLER_URL` ×1, `https://example.com/mirror/rakazo/infra/compose/install-images.sh` ×1 |
| infra/compose (tests) | 8 | 1 | `rakazo` ×3, `/var/lib/rakazo/firewall-change` ×1, `/usr/local/sbin/rakazo-host-alert` ×1 |
| scripts/restore.sh | 8 | 1 | `rakazo` ×5, `rakazo_app` ×2, `SRC/rakazo.sql` ×1 |
| packages/logging | 7 | 4 | `@rakazo/logging` ×1, `rakazo-api` ×1, `rakazo-worker` ×1 |
| packages/memory | 7 | 2 | `@rakazo/adapter-kit` ×3, `@rakazo/db` ×3, `@rakazo/memory` ×1 |
| packages/auth | 6 | 3 | `@rakazo/core` ×2, `@rakazo/db` ×2, `@rakazo/auth` ×1 |
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
