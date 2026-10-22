# @nurlings/brand

The single place the Nurlings brand is defined: configuration, the helpers that rebrand upstream
text, the placeholder artwork, and the checks that keep the white-label from regressing.

| Piece | Where |
|---|---|
| Brand configuration (name, bot terms, tagline, URLs, bundle id, registry, colours, updater flags) | `brand.json`, read through `import { brand } from "@nurlings/brand"` |
| Rewrites upstream strings at load time (`Rakazo` → name, `bot(s)` → Nurling(s)) | `brandText`, `brandMessages` |
| Source artwork (what you replace) | `assets/` |
| Per-platform icon generator | `pnpm --filter @nurlings/brand export:assets` |
| Guards | `pnpm brand:check` |

Do not write the product name as a literal in new code; read it from `brand`.

## Replacing the placeholder artwork

The files in `assets/` are plain placeholder tiles (a geometric "N"). To use real artwork:

1. Overwrite the **source** files listed below, keeping each file's exact pixel size and name.
2. Run `pnpm --filter @nurlings/brand export:assets`. It rewrites every web, desktop and mobile
   icon from the sources.
3. Run `pnpm brand:check` (it fails if a source or generated file is missing or the wrong size),
   then commit the sources **and** the generated files.

`pnpm --filter @nurlings/brand make:placeholders` recreates the placeholders but never overwrites
an existing file unless you pass `--force`, so real artwork is safe. Do not hand-edit the generated
files, and do not run upstream's `ui-tokens` generator directly: `pnpm --filter @rakazo/ui-tokens
export:brand` now just calls `export:assets`.

## Source files (you edit these)

| Source | Size | Used for |
|---|---|---|
| `assets/logo/nurlings-mark.png` | 1024×1024, transparent | The mark on its own |
| `assets/logo/nurlings-wordmark.svg` | vector | The wordmark (uses `currentColor`) |
| `assets/app-icon/app-icon-1024.png` | 1024×1024, opaque, full-bleed | Web, desktop and iOS/Android launcher icons |
| `assets/app-icon/Nurlings.icon/` | Icon Composer bundle; layer `Assets/nurlings-mark.png` is 1024×1024 | macOS and iOS app icon (edit with Xcode 26+ Icon Composer) |
| `assets/android/adaptive-foreground-1024.png` | 1024×1024, transparent; keep art inside the central 66% (a 676px circle) | Android adaptive icon foreground |
| `assets/android/adaptive-background-1024.png` | 1024×1024, solid | Android adaptive icon background |
| `assets/android/monochrome-1024.png` | 1024×1024, white on transparent, inside the central 66% | Android themed icon and the in-app mobile mark |
| `assets/android/notification-72.png` | 72×72, white on transparent silhouette | Android notification icon |
| `assets/splash/splash-icon-1024.png` | 1024×1024 transparent, art about 620px and centred; it must read on both `#FCFCFC` and `#141414` | Mobile splash screen |
| `assets/favicon/favicon-128.png` | 128×128, rounded corners | Web and mobile web favicon |

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
