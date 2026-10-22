# Design: rebrand-nurlings (customer-facing UI only)

## Context

Clients see the web, desktop and mobile UIs and nothing else, so only those are white-labeled.
Of 8,696 `rakazo` occurrences, 433 are both in scope and not internal (see `proposal.md`
Appendix A); the design installs a thin brand layer so those read Nurlings and everything else
stays byte-identical to upstream.

Facts that shape the design (verified in the repo):

- Web UI strings go through **Lingui** (12 locale `.po` catalogs, one loader at
  `apps/web/src/lib/i18n.ts`). Only 7 message IDs contain "Rakazo"; 54 mention "bot(s)".
- Mobile uses typed locale maps (`apps/mobile/lib/locales/*.ts`) with one loader
  (`apps/mobile/lib/i18n.ts`) and ≈75 `t()` strings mentioning bots.
- Desktop visible text is hardcoded (`setup.html`, `setup.js`, `main.ts` menus/dialogs,
  `local-stack.ts`, `browser-auth.ts`, `auto-update.ts`); its window title comes from the web
  page `<title>`. There is **no tray**; the About item is Electron's built-in `role: "about"`.
- The desktop updater is already wrapped in `DesktopUpdateController({ …, disabled })`; the
  `disabled` flag exists today (driven by an env var).
- Mobile already has `apps/mobile/app.config.ts` wrapping `app.json`.
- Upstream generates every icon from one source image (`ui-tokens` `export-brand.ts`).
- The sidebar "Docs" link, "Get the mobile app", the AI-privacy link and the desktop cloud URL
  are the only Rakazo-pointing links in these UIs. No Discord/waitlist link exists in them.

## Goals / Non-Goals

**Goals**
- One brand config feeding web, desktop and mobile UI.
- Smallest practical diff against upstream files; new behaviour in new files.
- A guard so an upstream merge cannot silently reintroduce the old name into these UIs.
- Neither the desktop updater nor mobile OTA can fetch a Rakazo build.

**Non-Goals**
- API, auth, emails, prompts, User-Agent, self-update, images/installer/CI, `apps/www`,
  telemetry, README/docs, and all internal identifiers (see Scope in the proposal).
- Changing bundle id, Android package, `rakazo://` scheme, Expo slug, desktop `appId`.

## Decisions

### D1 — Brand config in a new leaf package `packages/brand` (`@nurlings/brand`)

```
packages/brand/
  brand.json     # data; JSON so Node scripts, Expo config, and electron-builder helpers read it
  src/index.ts   # typed, validated accessor + helpers (brandMessages, brandText)
  assets/        # placeholder logo/icon/favicon/splash files (proposal sizes table)
  scripts/       # brand-check
  README.md      # asset size spec + upstream-merge checklist
```

| Field | Value |
|---|---|
| `name` | `Nurlings` |
| `bot.singular` / `bot.plural` | `Nurling` / `Nurlings` |
| `tagline` | `Powered by Nurturist AI` (login, footer/sidebar, About) |
| `company` | `{ name: "Nurturist AI", url: "https://nurturistai.com" }` |
| `urls.site` | `https://nurlings.nurturistai.com`; docs and privacy links point here until dedicated pages exist |
| `urls.cloud` / `urls.iosApp` / `urls.androidApp` / `urls.community` | `null` — the UI hides the entry (no Discord, no replacement) |
| `updates` | `{ desktop: false, mobileOta: false }` |
| `colors` | `{ themeLight, themeDark, splashLight, splashDark, iconBackground }`, **defaulting to today's values** so nothing shifts visually; `@rakazo/ui-tokens` stays the colour authority per `AGENTS.md` |
| `assets` | relative paths into `packages/brand/assets/` |

No native identifiers appear in the config: they are deliberately unchanged. The package has no
dependencies, so any workspace (web, desktop, mobile, `ui-web`, `contracts`) can import it
without cycles. The `@nurlings/*` scope marks "ours" at a glance.

*Considered and rejected*: a brand module inside `ui-tokens` (colours-only package; `contracts`
would depend on a UI package); env-var-driven branding (identity is a build-time property, and we
are avoiding new `RAKAZO_*`-style config).

### D2 — Each UI consumes the config at one seam

| Surface | Seam | Upstream files edited |
|---|---|---|
| Web UI strings | **Catalog load-time substitution** in `apps/web/src/lib/i18n.ts` (D3) | 1 |
| Web `<title>`, meta, manifest | small Vite plugin (new file) rewrites `index.html` and emits `site.webmanifest` from the config | `vite.config.ts` (1 line); `index.html`/manifest become templates |
| Web hardcoded text/links | `Wordmark` (`ui-web`), `Auth`, `Welcome`, `McpOAuthCallback`, `HonchoSettingsForm`, model-settings fields, `SidebarFooter` read `brand.*` | ≈8 |
| Mobile strings | same helper in `apps/mobile/lib/i18n.ts` | 1 |
| Mobile hardcoded text | `sign-in.tsx`, `_layout.tsx`, `endpoint.ts`, `models.tsx`, `ai-data-sharing.tsx` | ≈5 |
| Mobile identity | `app.config.ts` overlays **display name**, permission strings (camera, photos, microphone, speech, local network), splash/theme colours, and icons onto the config from `app.json`; `app.json` stays upstream-identical | `app.config.ts` |
| Desktop identity | layered electron-builder config supplies `productName`, mac microphone text and icon; verify empirically which mechanism electron-builder 26 honours (`--config` file / CLI `-c.*`); fallback is editing 3 lines of `package.json` guarded by `brand:check`. `appId`, `executableName`, `extraMetadata.name` untouched | 0–1 |
| Desktop runtime text | `setup.html` becomes a template filled where the setup window loads it; `setup.js`/`main.ts`/`local-stack.ts`/`browser-auth.ts`/`auto-update.ts` strings read the config; About panel gets name, version, tagline via `app.setAboutPanelOptions` | ≈6 |
| Shared constants | `contracts`: `AI_PRIVACY_URL` → brand site; `openai-compatible-ui.ts` text → brand name; store/APK URLs no longer opened (D5) | 3 |

Anything not in this table is not touched.

### D3 — Rebrand translated strings at catalog load, not in the catalogs

`.po` files, mobile locale maps and `scripts/translations-*.json` stay **identical to upstream**.
When a catalog loads, a helper walks the compiled messages (strings and nested token arrays) and
replaces whole-word `Rakazo` with `brand.name`, and the English words `bot`/`bots` with
`brand.bot.singular`/`plural` (decision 1: yes).

- `lingui extract` produces no diff, upstream string changes and new locales merge without
  conflict, and a **new upstream string containing "Rakazo" or "bot" is rebranded automatically**.
- Bot-word rule: whole word only, case-insensitive match → "Nurling(s)" capitalised as a brand
  noun; never touches identifiers (`bot-123`, `botId`, `bots/` paths) because those are not
  catalog message text; the 12 real catalogs are the test corpus, with a reviewed list of
  messages where the rule fires (so "robot", "chatbot", "bottom" are provably unaffected).
- Locales that translated "bot" into their own script keep that word until translators revisit
  (the task lists which locales are affected); the product name inside them is still rebranded.
- Possessives and affixes ("Rakazo's", "Rakazo-Server") survive because only the word is replaced.
- A message with no translation falls back to the English source id; the helper is applied on
  that path too (covered by a fixture).
- Guard test: load every locale on web and mobile through the real loaders and fail if the
  word "Rakazo" survives.

*Rejected*: editing 7 msgids × 12 locales plus mobile maps in place — simpler code, but every
future upstream touch of those lines conflicts and each new upstream string leaks until noticed.

### D4 — Updaters are disabled, not re-pointed

- **Desktop**: `DesktopUpdateController`'s existing `disabled` flag is set from
  `brand.updates.desktop === false` (one line in `main.ts`), and the `build.publish` block that
  names `elie222/rakazo` is dropped from the effective builder config so the packaged app does not
  even carry a Rakazo update feed. The in-app "update" UI then sees "no updates" (verified in the
  task). Unit test: with defaults the updater never initialises and no network call is made.
- **Mobile**: `app.config.ts` sets `updates.enabled = false` and removes `updates.url`, so the
  binary has no OTA channel. Left untouched and flagged: `owner` and `extra.eas.projectId` (needed
  by EAS builds, inert at runtime; you need your own Expo project to build — manual).

### D5 — Native identifiers unchanged (decision 3); store links hidden

Bundle id, Android package, `rakazo://` scheme, `slug`, desktop `appId`, Linux `executableName`
stay as upstream. Because the API trusts `rakazo://` and passkey config names the package, nothing
server-side needs to change. The mobile and web "Get the mobile app" entries and the mobile
force-update prompt currently open Rakazo's App Store listing / APK; they are hidden/inert when
`urls.iosApp`/`urls.androidApp` are `null` (default). See the proposal for the store-registration
consequence of keeping the bundle id.

### D6 — Assets: one folder, upstream generator repointed

Placeholder sources live in `packages/brand/assets/` (mark, wordmark SVG, `Nurlings.icon` bundle,
1024px icon, Android adaptive/monochrome/notification, splash, favicon). Upstream's
`export-brand.ts` is repointed at them (source path and icon-bundle name) and its `apps/www`
outputs are dropped (www is out of scope), so one generator remains and `apps/www` is untouched.
Placeholders are plain neutral "N" tiles, clearly temporary, with no Rakazo mascot. The desktop
build, mobile config and Vite plugin reference the generated files by their existing paths.

### D7 — Guardrails and the upstream-merge routine

- `brand:check` (vitest + node script): (a) every web/mobile locale, after the seam, contains no
  "Rakazo" word; (b) generated identity — Expo resolved config display strings, builder config
  `productName`/permission text, built `index.html` and manifest — contains none; (c) neither
  `elie222` nor `u.expo.dev` appears in the effective desktop/mobile runtime config; (d) `NOTICE`
  has the required attribution and `LICENSE` is byte-identical to upstream's.
- `packages/brand/README.md` documents the merge routine: `git fetch upstream && git merge
  upstream/main`, then `pnpm brand:check`, re-run `inventory.py`, review only *new* in-scope hits.

## Risks / Trade-offs

- **New hardcoded strings from upstream** are not caught by the catalog seam. Mitigation: the
  inventory report at merge time, plus the UI walk-through assertion in Playwright.
- **Lingui compiled-message shapes** (plural/select/rich text). Mitigation: the substitution is
  tested against the real catalogs of all 12 locales, not only fixtures.
- **Server-supplied text** (model/billing blurbs, update messages, emails) still says Rakazo; out
  of scope, listed in the proposal and reported by the final walk-through.
- **Bundle id/package are Rakazo's** → store/TestFlight distribution generally unavailable (see
  proposal). Accepted by decision 3.
- **Edits to `app.config.ts`, `vite.config.ts`, `i18n.ts`, `main.ts`** hit files upstream edits
  often; each edit is a one-line import/call into new files.
- **Clients only see this UI from images built from this repo** (Docker/CI out of scope).

## Migration Plan

Nothing is deployed from this change; there is no data migration. Order of work (see
`tasks.md`): brand package → web → mobile → desktop → assets → compliance (`NOTICE`) → guard →
final verification. Each group lands with its own tests.

## Open Questions

None block implementation. Two defaults are applied unless you say otherwise:

- **README / docs / issue templates / `SECURITY.md`** are outside the in-scope list and left
  as-is (they still say Rakazo). One word re-adds a README rewrite task.
- **Docs and privacy links** point at the site root (`https://nurlings.nurturistai.com`) because
  `apps/www` is out of scope and no dedicated pages exist; `brand.json` can gain separate
  `urls.docs`/`urls.privacy` fields when pages exist.
