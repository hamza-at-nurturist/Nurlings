# @nurlings/brand

The single place the Nurlings brand is defined: configuration, the helpers that rebrand upstream
text, the logo artwork, and the checks that keep the white-label from regressing.

| Piece | Where |
|---|---|
| Brand configuration (name, bot terms, tagline, URLs, bundle id, registry, colours, updater flags) | `brand.json`, read through `import { brand } from "@nurlings/brand"` |
| Rewrites upstream strings at load time (`Rakazo` → name, `bot(s)` → Nurling(s)) | `brandText`, `brandMessages` |
| Source artwork (what you replace) | `assets/` |
| PNG sources from the SVGs | `pnpm --filter @nurlings/brand make:sources` |
| Per-platform icon generator | `pnpm --filter @nurlings/brand export:assets` |
| Guards | `pnpm brand:check` |

Do not write the product name as a literal in new code; read it from `brand`.

## Updating the artwork

The artwork is vector. Four SVG files are the only things you edit:

| SVG | Used for |
|---|---|
| `assets/app-icon/nurlings-icon.svg` | The square app icon on the navy plate (iOS, Android, desktop, web) |
| `assets/logo/nurlings-mark.svg` | The full mark, transparent: blob and orb. In-app logo, desktop setup, splash, adaptive foreground |
| `assets/logo/nurlings-mark-small.svg` | The blob alone. Favicons, the Android themed icon and the notification icon, where the orb's eyes disappear |
| `assets/logo/nurlings-logo.svg` | The original composition. Reference only; nothing reads it |
| `assets/logo/nurlings-intro.svg` | The animated mark that plays once, then idles. Plain `<img>`: sign-in, the desktop setup screen and the web app's opening screen |
| `assets/logo/nurlings-loader.svg` | The animated mark on a loop. Plain `<img>`: full loading states |

Both animated files switch their animation off for `prefers-reduced-motion`, and the apps draw the
static mark if one fails to load. They are shown on the navy plate. Small inline spinners are left
alone: the mark would be too small to read.

The blob is white, so the transparent mark shows fully only on a dark background; the in-app mark
draws the blob in the text colour instead.

To change the artwork:

1. Replace the SVGs, and copy the new shapes and colours into `brand.json` (`mark`, `colors`). The
   check below fails if the two disagree.
2. `pnpm --filter @nurlings/brand make:sources -- --force` renders the PNG sources below from the
   SVGs. Without `--force` it never overwrites an existing file.
3. `pnpm --filter @nurlings/brand export:assets` writes every web, desktop and mobile icon from
   those sources.
4. `pnpm brand:check`, then commit the SVGs, the sources **and** the generated files.

Do not hand-edit the PNG sources or the generated files, and do not run upstream's `ui-tokens`
generator directly: `pnpm --filter @rakazo/ui-tokens export:brand` now just calls `export:assets`.

## The wordmark's typeface

The product name beside the mark is set in Poppins Medium (500) with letter-spacing -0.02em, the
typeface of nurturistai.com's header; the rest of the UI keeps its own. The font is self-hosted so
desktop and mobile work offline: `assets/fonts/poppins-latin-500.woff2` (Latin subset),
`assets/fonts/poppins.css` (its `@font-face`) and `assets/fonts/OFL.txt` (the SIL Open Font
License 1.1 it is distributed under). `brand.json` (`wordmarkFont`) holds the family, weight,
spacing and the fallback stack. The wordmark SVGs embed the font so they render the same as images.
`nurlings-wordmark.svg` follows the surrounding text colour only when placed inline; as an `<img>`
it renders black, so use `nurlings-wordmark-light.svg` or `nurlings-wordmark-dark.svg` anywhere the
file is used as an image.

## Platform rules the checks enforce

- The Android adaptive foreground and the themed icon keep all visible pixels inside the central
  circle of 676 pixels (66% of the layer) and fill at least 95% of its radius: the mark is placed
  so the smallest circle around it is 672 pixels across.
- The app icon, the iOS and Android legacy icons and the adaptive background are opaque.
- Favicons use the blob alone on a navy rounded plate, drawn from the vector at 16, 32 and 48
  pixels. The themed and notification icons are white on transparent.
- The app icon source is a render of its SVG: edit the SVG and the check names the stale file.

## Source files (you edit these)

| Source | Size | Used for |
|---|---|---|
| `assets/app-icon/nurlings-icon.svg`, `assets/logo/nurlings-mark.svg`, `assets/logo/nurlings-mark-small.svg`, `assets/logo/nurlings-logo.svg` | vector | The artwork itself (see above) |
| `assets/logo/nurlings-mark.png` | 1024×1024, transparent | The full mark with a margin |
| `assets/logo/nurlings-wordmark.svg` | vector | The mark and the product name (uses `currentColor`, for inline use) |
| `assets/logo/nurlings-wordmark-light.svg` | vector | The same with fixed colours, navy text and blob, for light backgrounds outside the app (socials, docs, emails) |
| `assets/logo/nurlings-wordmark-dark.svg` | vector | The same with fixed colours, white text and blob, for dark backgrounds outside the app |
| `assets/app-icon/app-icon-1024.png` | 1024×1024, opaque, full-bleed | Web, desktop and iOS/Android launcher icons |
| `assets/app-icon/Nurlings.icon/` | Icon Composer bundle; layer `Assets/nurlings-mark.png` is 1024×1024 | macOS and iOS app icon (edit with Xcode 26+ Icon Composer) |
| `assets/android/adaptive-foreground-1024.png` | 1024×1024, transparent; the full mark inside the central 66% (a 676px circle) | Android adaptive icon foreground |
| `assets/android/adaptive-background-1024.png` | 1024×1024, solid navy | Android adaptive icon background |
| `assets/android/monochrome-1024.png` | 1024×1024, the blob alone in white on transparent, inside the central 66% | Android themed icon and the in-app mobile mark |
| `assets/android/notification-72.png` | 72×72, the blob alone as a white silhouette | Android notification icon |
| `assets/splash/splash-icon-1024.png` | 1024×1024 transparent, the mark about 620px wide and centred; the splash background is navy in both themes | Mobile splash screen |
| `assets/favicon/favicon-128.png` | 128×128, rounded navy plate with the blob | Web and mobile web favicon |

## Generated files (do not edit)

| Platform | File | Size |
|---|---|---|
| Web app | `apps/web/public/favicon.ico` | frames 16, 32, 48 |
| Web app | `apps/web/public/favicon-16x16.png` | 16×16 |
| Web app | `apps/web/public/favicon-32x32.png` | 32×32 |
| Web app | `apps/web/public/favicon.png` | 128×128 |
| Web app | `apps/web/public/apple-touch-icon.png` | 180×180 |
| Web app | `apps/web/public/icon-192.png` | 192×192 |
| Web app | `apps/web/public/icon-512.png` | 512×512 |
| Windows | `apps/desktop/assets/icon.ico` | frames 16, 32, 48, 64, 128, 256 |
| Linux | `apps/desktop/assets/icon.png` | 1024×1024 (512 minimum) |
| macOS (development dock icon) | `apps/desktop/assets/icon-macos.png` | 1024×1024, rounded |
| iOS and Android launcher | `apps/mobile/assets/icon.png` | 1024×1024, no alpha |
| Android adaptive | `apps/mobile/assets/adaptive-icon.png` | 1024×1024 |
| Android adaptive | `apps/mobile/assets/icon-background.png` | 1024×1024, no alpha |
| Android themed / in-app mark | `apps/mobile/assets/monochrome-icon.png` | 1024×1024 |
| Android notification | `apps/mobile/assets/notification-icon.png` | 72×72 |
| Mobile splash | `apps/mobile/assets/splash-icon.png` | 1024×1024 |
| Mobile web | `apps/mobile/assets/favicon.png` | 128×128 |

The marketing site (`apps/www`) is not generated or changed here. The desktop app has no tray
icon, so none is needed. The packaged macOS icon comes from the `Nurlings.icon` bundle, not from
`icon-macos.png`.

## Needed by the stores (manual, not generated)

- App Store listing icon: 1024×1024 PNG with **no alpha** (export from `app-icon-1024.png`).
- Google Play hi-res icon: 512×512 PNG; feature graphic 1024×500.
- Screenshots per each store's current requirements.

## Checks

- `pnpm brand:check` verifies `LICENSE` is byte-identical to upstream's and that all artwork and
  generated icons exist at the sizes above.
- Image names and registry paths are lowercase everywhere; `registry` in `brand.json` must be a
  lowercase image prefix.
- `pnpm --filter @nurlings/brand test` runs the unit tests, including one that fails if this README
  stops listing a source or generated file.

## Merging upstream

The branch stays mergeable with `elie222/rakazo` because upstream files are left alone: brand
changes sit in new files, a few seams (`activateLoaded`, the mobile `t()`, `app.config.ts`, the Vite
plugin, `copy-static.mjs`) and the small edits listed in the OpenSpec change `rebrand-nurlings`.

1. `git fetch upstream && git merge upstream/main`. Expect, at most, small conflicts in files this
   change edits (an import line next to a changed one, for example); keep both sides.
2. `pnpm install`, then `pnpm brand:check`. It fails with the file and line if a merge brought back
   the old name in a place it guards: compose or env image defaults, the desktop package, the
   Expo `app.json`, server-sent text, the deployment guide, `NOTICE`, `LICENSE`.
3. `pnpm test` and `pnpm check`. The vitest suites in `apps/web`, `apps/mobile` and
   `apps/desktop` compile every translation catalog and scan the desktop strings, so new upstream
   copy that still says Rakazo fails there.
4. Build the web app and run `pnpm brand:check --built` (CI does this) to scan `apps/web/dist`.
5. Review only the new in-scope hits: re-run `git grep -nIi rakazo` and compare against
   `openspec/changes/rebrand-nurlings/inventory.py`'s categories. Internal identifiers
   (`@rakazo/*`, `RAKAZO_*`, the `rakazo://` scheme) stay.
6. A new workspace package must also be listed in both Dockerfiles; `infra/updater` has a test for it.
