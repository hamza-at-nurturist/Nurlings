# Tasks

> Scope: the logo artwork only. Bot avatars, `apps/www` and internal identifiers are untouched.
> Nothing is committed before the maintainer says "ship it" (task 5.1).

## 1. Sources and configuration

- [x] 1.1 Add the SVG sources to `packages/brand/assets` and extend `brand.json` and the schema (mark shapes, gradient, colours, wordmark typeface, SVG and animation asset paths). Verify: schema tests cover the new fields and reject malformed values.
- [x] 1.2 Add a check that `brand.json`'s mark equals the SVG files, and that the animated files draw the same blob and eyes with the brand colours, honour reduced motion and carry no script. Verify: tests fail when either side is edited and pass now.

## 2. Generation

- [x] 2.1 Replace the placeholder generator with `render-sources.ts` (SVG to PNG sources), render favicons from the vector, and place the Android layers and the splash as large as allowed; run both scripts with `--force`. Verify: every generated file exists at the documented size and re-running changes nothing.
- [x] 2.2 Add checks for the platform rules: opaque launcher icons, blob-only small icons, the adaptive foreground and themed icon between 95% and 100% of the 676 pixel safe circle, and the app icon as a render of its SVG. Verify: tests measure the files and fail on an oversized or undersized layer.
- [x] 2.3 Update `packages/brand/README.md` for the sources, scripts, typeface and rules. Verify: the README test that lists every source and generated file passes.

- [x] 2.4 Export `nurlings-wordmark-light.svg` and `nurlings-wordmark-dark.svg` with fixed colours and the font embedded. Verify: the brand check fails on `currentColor` or the wrong text colour, and both render correctly as images in Chromium.

## 3. Typeface

- [x] 3.1 Self-host Poppins Medium (Latin woff2, stylesheet and OFL licence) in `packages/brand`, apply it to the in-app wordmark only through the brand configuration, and embed it in `nurlings-wordmark.svg`. Verify: a unit test checks the wordmark's family, weight and spacing, a check covers the font files and licence, and a built web app contains the font file and its `@font-face`.

## 4. In-app logo and animation

- [x] 4.1 Redraw `BrandMark` and `Wordmark`, add `BrandAnimation` (plain image on the navy plate, static mark for reduced motion or a failed load), and re-crop the mobile `AppMark`. Verify: ui-web unit tests, including reduced motion and the fallback.
- [x] 4.2 Use the intro on sign-in, the desktop setup screen and the web app's opening screen, and the loop in Reconnecting and booting the live desktop; set the splash image width. Verify: unit tests for each site and the setup build; Chromium screenshots with and without reduced motion.
- [x] 4.3 Check the bot avatar in chat and the sidebar and report what it is. Verify: reported to the maintainer; no change made.

## 5. Review and release

- [x] 5.1 Show the contact sheet, the in-app preview and the animation frames. Verify: the maintainer said "ship it" before anything was committed.
- [x] 5.2 Run `pnpm brand:check` (also `--built`), the unit tests, lint and typecheck; open the pull request with the checklist below; merge when CI is green. Verify: green CI on the head commit. Done in pull request 6: every job passed except the Playwright report aggregator, which failed twice before getting a runner while all four shards passed; the maintainer approved merging.

## Workflow follow-up

- Pull request checklist: test the Icon Composer bundle in a real Xcode build; look at the launcher icon, themed icon and splash on a device or emulator.
- Cut `v0.1.1` from `main` once this change is merged (a single tag; it ships the real logo).
- Archive the change after merge.
- Then open a separate OpenSpec change and pull request to redraw the bot avatar.
