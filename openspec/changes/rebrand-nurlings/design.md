# Design: rebrand-nurlings

## Context

Rakazo's name is spread across ~1,565 files, but only ~16% of the 8,696 occurrences are things a
person can see (see `proposal.md` Appendix A). The design goal is therefore *not* "replace a word"
but "install a thin, well-placed brand layer so the visible 16% reads Nurlings, and keep the other
84% byte-identical to upstream".

Facts that shape the design (all verified in the repo):

- Web UI strings go through **Lingui** (`<Trans>`, 12 locale `.po` catalogs, one loader at
  `apps/web/src/lib/i18n.ts`). Only **7 message IDs** contain "Rakazo"; 54 mention "bot(s)".
- Mobile uses typed locale maps (`apps/mobile/lib/locales/*.ts`) with one loader
  (`apps/mobile/lib/i18n.ts`).
- Many visible strings are **not** in catalogs: desktop `setup.html`/`setup.js`, auth emails
  (`packages/auth`), API messages (`apps/api`), model/billing blurbs (`packages/adapters/src/pi-*.ts`),
  self-update messages (`packages/core`), MCP OAuth `client_name`, marketing site (`apps/www`).
- Static identity files exist in four toolchains: Electron (`apps/desktop/package.json` `build`),
  Expo (`apps/mobile/app.json` + an existing `app.config.ts`), Vite (`apps/web/index.html`,
  `public/site.webmanifest`), Astro (`apps/www`, already centralised in `src/site.ts`).
- Upstream already generates every icon from one source image (`ui-tokens` `export-brand.ts`).

## Goals / Non-Goals

**Goals**
- One brand config; surfaces read it. Changing the name later is a one-file change.
- Smallest practical diff against upstream files; new behaviour lives in new files.
- Automated guard so an upstream merge cannot silently bring "Rakazo" back to a user.
- Nothing contacts Rakazo-owned infrastructure.

**Non-Goals**
- Renaming internals (`@rakazo/*`, `RAKAZO_*`, DB/Docker/code identifiers).
- Building/hosting our own images, app listings, signing identities (flagged, not done).
- Writing new legal text; writing new marketing content.

## Decisions

### D1 — Brand config lives in a new leaf package `packages/brand` (`@nurlings/brand`)

```
packages/brand/
  brand.json          # data: the single source of truth (JSON so Node scripts, Astro, Expo
                      #       config, electron-builder helpers can read it without a TS build)
  src/index.ts        # typed, validated accessor + helpers (brandMessages, brandText)
  assets/             # placeholder logo/icon/favicon/splash files (see proposal sizes table)
  scripts/            # export-assets, brand-check
  README.md           # asset size spec + "how to merge upstream" checklist
```

`brand.json` fields (defaults shown):

| Field | Value |
|---|---|
| `name` / `bot.singular` / `bot.plural` | `Nurlings` / `Nurling` / `Nurlings` |
| `tagline` | `Powered by Nurturist AI` (shown in footer, about, login) |
| `company` | `{ name: "Nurturist AI", url: "https://nurturistai.com" }` |
| `urls.site` / `urls.app` | `https://nurlings.nurturistai.com` / same until a hosted app exists |
| `urls.docs` / `urls.privacy` / `urls.terms` / `urls.support` | site paths (pages are placeholders until legal review) |
| `urls.repo` | our repository (drives self-update, Q4) |
| `urls.iosApp` / `urls.androidApp` / `urls.cloud` | `null` — UI hides the entry when null |
| `urls.community` | `null` — **no Discord, no replacement** |
| `ids` | `{ bundleId: "com.nurturistai.nurlings", scheme: "nurlings", slug: "nurlings", desktopAppId: "com.nurturistai.nurlings", userAgent: "Nurlings" }` |
| `colors` | `{ themeLight, themeDark, splashLight, splashDark, iconBackground }` — **defaults equal today's values** (`#FCFCFC`, `#141414`, …) so there is no visual change; `@rakazo/ui-tokens` semantic tokens stay the colour authority per `AGENTS.md` |
| `assets` | relative paths into `packages/brand/assets/` |

The package depends on nothing and nothing it depends on depends on `@rakazo/*`, so every
workspace (including `packages/contracts` and `packages/core`, which hold hardcoded Rakazo URLs
today) can import it without cycles. The `@nurlings/*` scope marks "ours" at a glance.

*Alternatives considered*: a `brand.ts` inside `ui-tokens` (rejected: colours-only package, and
`contracts`/`core` would have to depend on a UI package); env-var driven branding (rejected:
brand is a build-time identity, and `RAKAZO_*`-style config is what we are avoiding adding to).

### D2 — Each surface consumes the config at one seam

| Surface | Seam | Upstream files edited |
|---|---|---|
| Web UI strings | **Catalog load-time substitution** in `apps/web/src/lib/i18n.ts` (D3) | 1 (a 2-line call) |
| Web `<title>`, meta, manifest | Vite plugin (new file, registered in `vite.config.ts`) rewrites `index.html` and emits `site.webmanifest` from config | `vite.config.ts` (1 line), `index.html` / `public/site.webmanifest` become templates |
| Mobile strings | Same helper in `apps/mobile/lib/i18n.ts` | 1 |
| Mobile identity | `apps/mobile/app.config.ts` already receives `config` from `app.json`; it overlays name/slug/scheme/bundleIdentifier/package/permission strings/colours/`owner`/`eas`/`updates` from the brand config. **`app.json` stays upstream-identical** | `app.config.ts` (one overlay function) |
| Desktop identity | electron-builder reads a layered config: brand-generated overrides on top of the `build` block (validate empirically which mechanism electron-builder 26 honours: `--config` file with `extends`, or CLI `-c.*`); fallback is editing the ~6 identity lines of `package.json` guarded by `brand:check` | 0–1 (`package.json`) |
| Desktop runtime text | `setup.html` becomes a template with `{{brand.name}}` tokens filled where the setup window loads it (`main.ts`); `setup.js` strings read the same values through the existing preload/IPC | `setup.html`, `setup.js`, 1 line in `main.ts` |
| Server-generated text (emails, API notices, model/billing blurbs, self-update messages, MCP OAuth `client_name`, secrets-guard error) | direct `import { brand } from "@nurlings/brand"` | ≈12 files, 1–5 lines each |
| Marketing site | `apps/www/src/site.ts` is rebuilt from the brand config; pages that hardcode the name import it | `site.ts`, ≈40 pages/components |
| Docs shown to users (README, docs/*.md, SETUP_PROMPT, templates) | hand-edited text (static Markdown cannot read config); the README is fully rewritten | docs only |

### D3 — Rebrand upstream's translated strings at catalog load, not in the catalogs

`.po` files and mobile locale maps stay **identical to upstream**. When a catalog is loaded, a
helper walks the compiled messages (Lingui compiled messages are strings or token arrays) and
replaces whole-word `Rakazo` with `brand.name`. Consequences:

- `lingui extract` produces no diff; upstream string changes and new locales merge without
  conflict; a **new upstream string containing "Rakazo" is rebranded automatically**.
- A unit test loads every locale catalog on web and mobile and fails if "Rakazo" survives the
  seam (the guard for this class).
- Possessives and inflection ("Rakazo's", "Rakazo-Server") survive because only the word is
  replaced; in non-Latin locales the name appears in Latin script already.
- Known edge: a message with no translation falls back to the English source id — the helper is
  applied to the fallback path too (covered by the test via an untranslated fixture).

*Alternative considered*: editing the 7 msgids × 12 locales (+ mobile maps) in place. Smaller
code, but every future upstream string/translation touching those lines conflicts, and each new
upstream "Rakazo" string leaks until someone notices. Rejected for mergeability.

### D4 — Update channels are re-pointed or switched off (T1–T3)

- **Desktop auto-update (T1)**: the `publish` block names our repo, and the updater is skipped
  unless the brand config marks updates enabled (`updates.desktop: false` by default) — a Nurlings
  build never asks Rakazo's releases for a binary.
- **Server self-update (T2)**: `OFFICIAL_REPO_URL`, `PUBLISHED_IMAGE_REPO`, and the installer
  download base read from `brand.urls.repo` / `brand.registry`. Because our repo is private, in-product
  updates need credentials; until then the update UI reports "no update source configured" rather
  than offering Rakazo's.
- **Mobile OTA (T3)**: `owner`, EAS `projectId` and `updates.url` come from `EXPO_OWNER`,
  `EAS_PROJECT_ID`, `EAS_UPDATES_URL` read in `app.config.ts`; `app.json`'s Rakazo values are
  overridden/removed so a build without them has no OTA channel instead of Rakazo's.

### D5 — Native identifiers (Q3) and upstream compatibility

Proposed: iOS bundle id / Android package / Electron appId `com.nurturistai.nurlings`; URL scheme
`nurlings`. The API currently hardcodes `rakazo://` (auth trusted origins, `apps/api/src/app.ts`)
and `com.rakazo.app` (`app-association.ts` for passkey `assetlinks.json`). Both become
brand-config values, and the API **accepts both schemes** so a client built from unmodified
upstream keeps working against a Nurlings server (and vice versa). Maestro flows (`appId:`,
`rakazo://`) read the new ids. Passkey Apple App IDs / Android cert fingerprints remain
deployment env vars (manual, listed in the PR).

### D6 — Assets: one folder, upstream's generator repointed

`packages/brand/assets/` holds the **source** placeholders (mark, wordmark SVG, `Nurlings.icon`
bundle, 1024px app icon, Android adaptive/monochrome/notification, splash, OG). Upstream's
`export-brand.ts` already derives every platform size from one image; we repoint its 2 source
paths and 1 output name to the brand folder/config (3 hunks) rather than keeping a second
generator that could drift. Placeholders are generated (neutral "N" tile) so they are obviously
temporary and contain no Rakazo mascot.

### D7 — Model-facing text (Q5)

Rebrand the ≈5 identity sentences (`You are a Rakazo bot…` → `You are a {bot.singular}…`,
`Rakazo is resuming…`) so bots do not introduce themselves with the old name. **Keep** persisted
markers that stored data is matched against (`AUTOMATED_MESSAGE_LABEL`,
`Rakazo-owned compacted context through message sequence `, reserved peer ids): changing them
would make existing history look unrecognised. Tests that assert prompt text read the config.

### D8 — Marketing site (Q2)

Name, URLs, titles, structured data, OG images, sitemap host follow the brand config. Pages that
make Rakazo-specific claims or are legal text are handled per Q2 rather than silently
re-labelled: a privacy policy or terms of service that names a different operator is worse than
none. `analytics.ts` (PostHog) stays env-gated and off.

### D9 — Guardrails and the upstream-merge routine

- `brand:check` (vitest + node script): (a) catalogs after the seam contain no "Rakazo";
  (b) generated identity (Expo resolved config, electron-builder config, Vite-built `index.html`
  and manifest) contains no "rakazo" outside an explicit allow-list of internal tokens;
  (c) none of the T1–T7 hosts appear in shipped runtime config; (d) `NOTICE` exists and `LICENSE`
  hash equals upstream's.
- `packages/brand/README.md` documents the merge routine: `git fetch upstream && git merge
  upstream/main`, then `pnpm brand:check`, re-run `inventory.py` and review only *new*
  user-facing hits.

## Risks / Trade-offs

- **Hardcoded upstream strings added later** are not caught by the catalog seam. Mitigation: the
  inventory script as a merge-time report, plus Playwright smoke assertions on the main screens.
- **Lingui compiled-message shapes** differ between plural/select/rich-text messages. Mitigation:
  the substitution handles strings and nested arrays and is tested against real catalogs from all
  12 locales, not fixtures.
- **Changing native identifiers is irreversible once published** (new store listing). Mitigation:
  explicit approval gate (Q3); nothing is published by this change.
- **Edits to `app.config.ts`, `vite.config.ts`, `i18n.ts` are in files upstream touches often.**
  Mitigation: each edit is a one-line import/call into new files.
- **Private repo vs. self-update/installer/GHCR** (T2, Docker section): functionally blocked until
  images and installer are hosted publicly or credentialed. Out of scope; flagged.

## Migration Plan

Nothing is deployed, so there is no data migration. Order of work (see `tasks.md`): brand package →
seams (web, mobile, desktop, server) → identity & update channels → assets → www → docs/README/NOTICE
→ tests & guards → full verification. Each group lands with its own tests.

## Open Questions

Each has a recommendation; answer inline when approving, or say "go with your recommendations".

- **Q1 — "bot" → "Nurling(s)" in UI copy.** *Recommend yes*: extend the D3 helper to rewrite
  the English words `bot`/`bots` (whole word, capitalised as "Nurling(s)" because it is a
  brand noun) in message values; locales with translated native-script words keep them until
  translators revisit. Not applied to identifiers like `bot-` ids or `botId`. If **no**, the
  config still carries the terms but only new/branded surfaces (welcome, empty states) use them.
- **Q2 — `apps/www` scope.** *Recommend*: brand name/URLs everywhere; `privacy`/`terms`/`support`
  replaced with minimal placeholder pages saying the document is coming (no Rakazo operator text);
  blog and "X alternative" comparison pages kept in the repo but removed from nav/sitemap/
  `llms.txt` until rewritten; "Cloud/billing/subscription" copy removed from user-visible pages.
- **Q3 — Native identifiers.** *Recommend* `com.nurturistai.nurlings` + scheme `nurlings`.
- **Q4 — Self-update target.** *Recommend* config-driven, default to our repo, UI says
  "no update source" when unreachable/unauthenticated.
- **Q5 — Model-facing text.** *Recommend* rebrand identity sentences, keep persisted markers.

Note: Rakazo's marketing one-liners ("AI teammates you actually own", comparison claims) are their
copy, not brand data. The config carries only "Powered by Nurturist AI"; any product description
text we write ourselves in the README and site, and you can replace it.
