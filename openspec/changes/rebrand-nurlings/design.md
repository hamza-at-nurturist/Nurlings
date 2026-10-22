# Design: rebrand-nurlings (UI + dedicated-server branding)

## Context

Each client gets a dedicated server running Nurlings. They see the web, desktop and mobile apps
and the text their server sends; our operators pull images and upgrade the server. So we
white-label (a) the three UIs, (b) the server text clients read, and (c) the delivery path
(images, installer, updaters). Of 8,696 `rakazo` occurrences, 507 are in scope and not internal
(`proposal.md` Appendix A); the design installs a thin brand layer for those and leaves
everything else byte-identical to upstream.

Facts that shape the design (verified in the repo):

- Web UI strings go through **Lingui** (12 `.po` catalogs, loader `apps/web/src/lib/i18n.ts`);
  only 7 message IDs contain "Rakazo", 54 mention "bot(s)". Mobile has typed locale maps and one
  loader (`apps/mobile/lib/i18n.ts`).
- Desktop text is hardcoded; there is no tray; About is Electron's `role: "about"`; the updater is
  wrapped in `DesktopUpdateController({ …, disabled })`.
- Mobile has `app.config.ts` wrapping `app.json`. The bundle id is a literal in `app.json` and
  appears in server code **once**: `ANDROID_PACKAGE` in `apps/api/src/app-association.ts`.
  The URL scheme is a separate field; the API's trusted mobile origins are scheme-based.
- The API already has `UpdaterProxyConfig.disabled` ("Self-update is switched off for this
  deployment") but nothing sets it; the web "Software update" section renders only when the
  install kind is `sidecar`. The sidecar is an opt-in compose profile.
- Account email text lives in `packages/auth` (4 emails: verify, sign-in code, password reset,
  account deletion). There is no invite email: invites are chat-channel messages in
  `apps/api/src/messaging-inbound.ts`.
- Images: five compose files and `.env.images.example` default to `ghcr.io/elie222/rakazo/*`; the
  installer downloads from `raw.githubusercontent.com/elie222/rakazo`. Upstream's publish workflow
  pushes to `ghcr.io/${{ github.repository }}/<name>` (mixed-case repo name → invalid Docker
  reference), builds arm64 on `ubuntu-24.04-arm`, attests provenance, and is pinned by a
  structural test (`infra/updater/src/publish-workflow.test.ts`).

## Goals / Non-Goals

**Goals**
- One brand config feeding the UIs, the server text, the image registry and the bundle id.
- Smallest practical diff to upstream files; new behaviour in new files.
- A guard so an upstream merge cannot silently reintroduce the old name where clients see it.
- No updater (desktop, mobile OTA, server self-update) can replace our build with Rakazo's.
- Images built from this repo, pulled from our private registry by client servers.

**Non-Goals**
- Model prompts, bot User-Agent, internal error strings, `apps/www`, telemetry wiring,
  README/docs/templates/`SECURITY.md`, and all internal identifiers.
- Changing the `rakazo://` scheme, Expo `slug`, desktop `appId`, Linux `executableName`.
- Re-pointing any updater (they are disabled).

## Decisions

### D1 — Brand config in a new leaf package `packages/brand` (`@nurlings/brand`)

```
packages/brand/
  brand.json     # data; JSON so Node scripts, Expo config, electron-builder helpers read it
  src/index.ts   # typed, validated accessor + helpers (brandMessages, brandText)
  assets/        # placeholder logo/icon/favicon/splash files
  scripts/       # brand-check
  README.md      # asset size spec + upstream-merge checklist
```

| Field | Value |
|---|---|
| `name` | `Nurlings` |
| `bot.singular` / `bot.plural` | `Nurling` / `Nurlings` |
| `tagline` | `Powered by Nurturist AI` (login, sidebar footer, desktop About) |
| `company` | `{ name: "Nurturist AI", url: "https://nurturistai.com" }` |
| `urls.site` | `https://nurlings.nurturistai.com` (docs and privacy links point here for now) |
| `urls.cloud` / `urls.iosApp` / `urls.androidApp` / `urls.community` | `null` — UI hides the entry (no Discord, no replacement) |
| `native.bundleId` | `com.nurturistai.nurlings` (iOS bundle id **and** Android package) |
| `mark` | `{ viewBox, path }`: the in-app logo as one SVG path, drawn by the UI (`BrandMark`, `Wordmark`) and used to generate the placeholder PNGs; real artwork replaces this value or the component |
| `registry` | `ghcr.io/REPLACE_WITH_ORG/nurlings` — image prefix, lowercase; the exact placeholder is the only uppercase value accepted, and `brand:check --release` fails while it remains |
| `updates` | `{ desktop: false, mobileOta: false, serverSelfUpdate: false }` |
| `colors`, `assets` | defaults equal today's values / paths into `packages/brand/assets/` |

The scheme, slug and desktop `appId` are deliberately not in the config. The package has no
dependencies, so web, mobile, desktop, `ui-web`, `contracts`, `auth`, `api`, `adapters` and `core`
can import it without cycles. Anything Node loads directly (for example `vite.config.ts`, which
loads config-time modules with plain type stripping) must use the self-contained subpaths
`@nurlings/brand/schema` and `@nurlings/brand/brand.json`, because the entry point's sibling
imports (`./schema.js`) do not resolve there; the package compiles with `erasableSyntaxOnly` so
its sources stay loadable. `@nurlings/*` marks "ours" at a glance.

*Rejected*: a module in `ui-tokens` (colours-only; `contracts`/`auth`/`api` would depend on a UI
package); env-var-driven branding (identity is a build-time property; avoids new `RAKAZO_*` config).

### D2 — Each surface consumes the config at one seam

| Surface | Seam | Upstream files edited |
|---|---|---|
| Web UI strings | catalog load-time substitution in `apps/web/src/lib/i18n.ts` (D3) | 1 |
| Web `<title>`, meta, manifest | small Vite plugin (new file `src/brand-html.ts`) transforms upstream's `index.html` and rewrites `site.webmanifest` at build and dev time; both upstream files stay byte-identical, and a pattern that stops matching throws | `vite.config.ts` (2 lines: import + plugin entry) |
| Web hardcoded text/links/logo | `Wordmark` + new `BrandMark` (`ui-web`), `AuthFrame` and `Welcome` (face logo → mark, tagline), `SidebarFooter` (Docs, store link, tagline) via `lib/brand-links.ts`. `Auth`/`McpOAuthCallback`/`HonchoSettingsForm`/model-settings strings are catalog keys: the seam rebrands them and editing them would orphan their translations | 5 |
| Mobile strings | same helper in `apps/mobile/lib/i18n.ts`; ≈5 hardcoded files | ≈6 |
| Mobile identity | `app.config.ts` calls `brandExpoConfig` (new `lib/brand-expo-config.ts`) to overlay display name, permission prompts, splash colours, the iOS icon bundle, **bundle id/package** and OTA off, and rejects `REPLACE_WITH_…` owner/project ids in release profiles. Expo evaluates `app.config.ts` by transpiling it to CJS with no TypeScript resolution for what it imports, so the helper is imported by explicit `.ts` extension (Node type stripping, one `@ts-expect-error TS5097`) and reads the brand through the self-contained subpaths `brand.json`, `schema`, `text`. `app.json` is edited on 5 lines only: `owner`, `projectId`, the two bundle-id literals, and the `updates` block (D5) | `app.config.ts`, `app.json` |
| Desktop identity | direct edits to `apps/desktop/package.json` (`productName`, `author.name`, mic text, mac icon path to `Nurlings.icon`, `build.publish` removed); a layered builder config was rejected because electron-builder reads the top-level `productName` from `package.json`. `appId`, `executableName`, `extraMetadata.name` untouched. The upstream mascot icon bundle is deleted | 1 |
| Desktop runtime text | `setup.html`/`setup.js` are branded while `scripts/copy-static.mjs` copies them (`src/brand-setup.ts`, patterns throw when upstream changes; the hosted-cloud choice is removed and "This computer" becomes the default); `main.ts`, `local-stack.ts`, `browser-auth.ts`, `auto-update.ts` read `brand.name`; About via `app.setAboutPanelOptions`; a saved profile pointing at the upstream cloud is discarded (`brand-desktop.ts`) | ≈6 |
| Shared constants | `contracts` loses three Rakazo URL constants (`AI_PRIVACY_URL`, `IOS_APP_STORE_URL`, `ANDROID_APK_URL`; replaced by a comment). Their only consumers (web footer, mobile update prompt, mobile consent, API consent default) now read `brand`. Removing them, rather than leaving them unused, is deliberate: Metro does not tree-shake (the Android bundle still shipped all three URLs as dead strings), and a future upstream use then fails to compile instead of linking to the upstream's store. `client-build.ts` is also loaded by plain Node from `vite.config.ts`, so it could not import the brand entry point anyway. `openai-compatible-ui.ts` text is a catalog key (rebranded by the seam) | 2 files, 3 lines |
| Server text (D9) | `import { brand } from "@nurlings/brand"` in `packages/auth`, `apps/api`, `packages/adapters`, `packages/core` | ≈9 |
| Self-update (D4) | `updaterConfig()` in `apps/api/src/router.ts` reads the flag | 1 line |
| Images/installer (D8) | compose defaults, `.env.images.example`, `install-images.sh`, new workflow + doc | ≈8 |

Anything not in this table is not touched.

### D3 — Rebrand translated strings at catalog load, not in the catalogs

`.po` files, mobile locale maps and `scripts/translations-*.json` stay **identical to upstream**.
When a catalog loads, a helper walks the compiled messages (strings and nested token arrays) and
replaces whole-word `Rakazo` with `brand.name`, and the English words `bot`/`bots` with
`brand.bot.singular`/`plural` (decision 1: yes).

- `lingui extract` produces no diff; upstream string changes and new locales merge without
  conflict; a **new upstream string containing "Rakazo" or "bot" is rebranded automatically**.
- Bot rule: whole word, capitalised as a brand noun; never touches identifiers (`bot-123`,
  `botId`, which are not catalog text); the 12 real catalogs are the test corpus, with a reviewed
  list of where the rule fires, so "robot", "chatbot", "bottom" are provably unaffected.
- Locales that translated "bot" into their own script keep that word until translators revisit
  (the task lists which); the product name inside them is still rebranded.
- Possessives and affixes ("Rakazo's", "Rakazo-Server") survive: only the word is replaced.
- Untranslated messages fall back to the English id; the helper covers that path (fixture).
- Guard test: every locale on web and mobile loaded through the real loaders contains no "Rakazo".

*Rejected*: editing 7 msgids × 12 locales plus mobile maps in place — every future upstream touch
of those lines conflicts and each new upstream string leaks until noticed.

### D4 — Every updater is disabled, not re-pointed

- **Desktop**: `DesktopUpdateController`'s `disabled` flag is set from
  `brand.updates.desktop === false` (one line in `main.ts`); the `build.publish` block naming
  `elie222/rakazo` is removed from `package.json`. Unit test: with defaults the
  updater module is never loaded and no network call is made.
- **Mobile OTA**: `app.config.ts` sets `updates.enabled = false` and no `updates.url`;
  `app.json`'s `updates` block (which held only the upstream URL) is removed.
- **Server self-update**: `updaterConfig()` sets `disabled: brand.updates.serverSelfUpdate === false`.
  `requireSidecar` then throws "Self-update is switched off for this deployment", `check` and
  `apply` never reach the sidecar, and `resolveInstallKind` reports a non-sidecar kind so the
  web Software-update section does not render. The updater sidecar stays an unstarted opt-in
  compose profile and `docs/nurlings-deployment.md` says not to enable it. `OFFICIAL_REPO_URL`,
  `PUBLISHED_IMAGE_REPO` and their tests are left alone: the code that uses them is unreachable.
  Upgrades are done by an operator (D8).

### D5 — Native identifiers: bundle id/package change, scheme and the rest do not

- iOS `bundleIdentifier` and Android `package` → `com.nurturistai.nurlings`, set by the
  `app.config.ts` overlay from `brand.native.bundleId` (single source). Maestro flows' `appId:` lines
  (≈16 files) get the new literal.
- **Scheme is not forced to change**: Expo's `scheme`, the API's trusted origins, and the OAuth/
  deep-link code never read the bundle id (grep-verified). `rakazo://` stays; `MOBILE_AUTH_ORIGINS`
  and `isTrustedOrigin` are untouched.
- **API changes, minimal**: `ANDROID_PACKAGE` in `app-association.ts` reads
  `brand.native.bundleId`; its test is updated. iOS needs no code: `PASSKEY_APPLE_APP_IDS` is a
  deployment env var, documented as `<TeamID>.com.nurturistai.nurlings`.
- **EAS and push**: in `app.json`, `owner` and `extra.eas.projectId` become obvious placeholders
  (`REPLACE_WITH_NURLINGS_EXPO_OWNER`, `REPLACE_WITH_NURLINGS_EAS_PROJECT_ID`) and `updates.url`
  is removed. Release-profile builds fail loudly while a placeholder is present (the `app.config.ts`
  release guard already throws for a missing API URL; the same guard rejects placeholders). Push
  registration (`lib/push.ts`) reads this project id inside a `try/catch`, so a placeholder leaves
  push inert instead of failing; before this change tokens would have been minted under Rakazo's
  Expo project, so push needs our project id before it works.
- Unchanged: `scheme`, `slug`, desktop `appId` `dev.rakazo.desktop`, Linux `executableName`.

### D6 — Assets: one folder, one generator

Placeholder sources live in `packages/brand/assets/`. A new generator,
`packages/brand/scripts/export-assets.ts`, writes the 17 web/desktop/mobile icon files from them and
never touches `apps/www`. Upstream's `ui-tokens/scripts/export-brand.ts` is left untouched and
unused: it bakes in the Rakazo mascot's position and does not produce five of the mobile/desktop
files, so repointing it would have been a larger, riskier edit. Instead `ui-tokens`'s `export:brand`
script (one `package.json` line) delegates to the new generator, so running it can never bring the
mascot back. Placeholders are neutral vector "N" tiles; `make-placeholders` refuses to overwrite
existing files without `--force`. The expected sizes live in one table (`src/assets.ts`) that the
README, the guard and the tests share.

### D7 — Guardrails and the upstream-merge routine

`brand:check` (vitest + node script): (a) every web/mobile locale after the seam has no "Rakazo"
word; (b) resolved Expo config (display name, permissions, bundle id/package, placeholders, no OTA),
builder config (`productName`, mic text, no `elie222` feed), built `index.html`/manifest are clean;
(c) each compose file's image defaults and `.env.images.example` equal `brand.registry`; (d)
server text: auth emails and chat/update/billing strings contain no "Rakazo"; (e) `NOTICE` has
the attribution and `LICENSE` is byte-identical to upstream's. `packages/brand/README.md` documents
the merge routine: `git fetch upstream && git merge upstream/main`, `pnpm brand:check`, re-run
`inventory.py`, review only new in-scope hits.

### D8 — Our images: new workflow, compose/installer defaults, documented client auth

- **New workflow `.github/workflows/publish-nurlings-images.yml`** (additive): on push to `main`
  (`edge`), tags `v*` (semver + `latest`) and `workflow_dispatch`; matrix `app`, `updater`,
  `computer` with the same Dockerfiles/contexts as upstream; pushes to
  `ghcr.io/<org>/nurlings/<name>` where the owner is lowercased in a step and every other segment is
  a lowercase literal (so the mixed-case `Nurlings` repo name never reaches an image reference); `GIT_SHA` build-arg for `app`; `packages: write` with the job token; actions pinned to the
  same commit SHAs as upstream; **amd64 only** and **no provenance attestation** (see Risks).
  Pull requests do not build images (cost); a structural test mirrors upstream's.
- **Upstream workflow guarded**: its `validate`, `build`, `publish` jobs get
  `github.repository == 'elie222/rakazo' &&` so they never run in our repo (they would fail on the
  mixed-case name); `publish-workflow.test.ts` is updated for that one condition. `installer-smoke`
  keeps running.
- **Compose and env defaults**: the 12 `ghcr.io/elie222/rakazo/…` defaults in `docker-compose.images.yml`,
  `docker-compose.prod.yml` and `docker-compose.prod.docker.yml`, plus the 2 in `.env.images.example`,
  become `ghcr.io/<org>/nurlings/…` (the real lowercase org, set when it is known — group 7); `RAKAZO_IMAGE*` variable names unchanged; the two
  updater tests that assert the old names are updated. `brand:check` enforces equality with
  `brand.registry`.
- **Installer** (`install-images.sh`, additive): clients get the **install kit** (installer, compose
  file, env example) delivered directly and run it with the existing local-files mode, so they never
  touch the private repo; the default `RAKAZO_DOWNLOAD_BASE` still points at our repo's raw URL and
  the optional `NURLINGS_DOWNLOAD_TOKEN` (bearer header on downloads) is a fallback only; optional
  `NURLINGS_REGISTRY_USER` + `NURLINGS_REGISTRY_TOKEN` run `docker login ghcr.io` (token via stdin,
  never logged) before the pull; a failed pull prints an auth hint; operator-facing echo text says
  Nurlings. Existing `--local/--offline` flows and smoke tests are preserved; a new smoke test
  covers the login path with a fake `docker`.
- **Client authentication, documented** in new `docs/nurlings-deployment.md` (no upstream docs
  edited): create a GitHub user (machine account) with read access to the three packages, issue a
  classic PAT with only `read:packages`, give it to the operator, run `docker login ghcr.io` (or set
  the installer variables); rotate by replacing the PAT; revoke by removing package access. The same
  document covers the install kit hand-off, the upgrade procedure (new tag in `RAKAZO_IMAGE_TAG`,
  `docker compose pull && up -d`), the desktop local-stack note (that host also needs
  `docker login`), and why not to enable the updater profile.

### D9 — Server text clients see: text only, same config

Edited strings read `brand.name` / `brand.bot`; no identifiers, env vars, ids or protocol markers
change. In scope: the four emails (subject, text and HTML) and Better Auth `appName`/passkey
`rpName`; chat-channel messages (`messaging-inbound.ts` ×2, `team-chat-bridge.ts` ×2 user-visible
lines); update messages in `core/self-update.ts`; model/billing blurbs in `pi-models.ts` and
`pi-oauth.ts`; MCP OAuth dynamic-registration `client_name` in `mcp-oauth.ts`. Installer echo text is
covered by D8. Not changed: `throw new Error(…)` strings, prompts, User-Agent, secrets-guard.
Provider-console names are a manual list (proposal).

## Risks / Trade-offs

- **Metro does not tree-shake**: whole workspace packages end up in the mobile bundle, so an
  unused upstream string still ships (hence the contracts constants were removed, not just
  unreferenced). Server-only code bundled via `@rakazo/core` (for example `OFFICIAL_REPO_URL`) is
  unreachable from the app and is allow-listed by the mobile bundle scan.
- **Hardcoded strings added later by upstream** are not caught by the catalog seam. Mitigation:
  `inventory.py` at merge time and the Playwright walk-through assertion.
- **Lingui compiled-message shapes** (plural/select/rich text): tested against real catalogs.
- **Repo transfer to an org is pending**: until the org name is known the registry is the
  placeholder; the move is a one-value change (`brand.registry`) plus a re-publish, and
  group 7 includes the post-transfer fix-ups (remote URL, workflow references, compose defaults).
- **Pipeline scope**: client servers are x86, so images are amd64 only and carry no provenance
  attestation (decided); both can be added back later. Installer downloads from a private repo
  need a token → clients receive the install kit instead.
- **Bundle id is now ours but unregistered**: nothing ships to a store from this change; account
  setup is manual (proposal).
- **Edits to `router.ts`, `app.config.ts`, `vite.config.ts`, `i18n.ts`, `main.ts`, the upstream
  workflow and compose files hit files upstream edits often**; each edit is small and mechanical.
- **Disabling self-update means operator-driven upgrades**; documented.

## Migration Plan

Nothing is deployed from this change. Order (see `tasks.md`): brand package → assets → web →
mobile → desktop → server (self-update, bundle id, text) → images → NOTICE → guard → verification.
Each group lands with its own tests. After the PR merges, the first run of the new workflow
publishes `edge`; nothing pulls it until a client server is provisioned.

## Open Questions

None block implementation. Pending input: the lowercase GitHub organization name (needed before
group 7). Defaults applied: docs/privacy links point at the site root; README/docs/issue
templates/`SECURITY.md` unchanged.
