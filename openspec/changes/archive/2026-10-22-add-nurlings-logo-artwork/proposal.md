# Proposal

## Why

The apps still carry the placeholder "N" tiles the rebrand left behind. Real Nurlings artwork has
been supplied (a white blob with a gradient orb on navy), so clients should see it in every icon,
favicon, splash screen and in-app logo instead of a temporary stand-in.

## What Changes

- Add the four supplied SVGs as the artwork sources in `packages/brand/assets`: the square app icon,
  the transparent full mark, the blob alone, and the original composition (reference only).
- Describe the mark in `brand.json` (blob, orb, gradient, viewBoxes) and update the colours to the
  brand's navy `#03091F`, white `#FFFFFF` and the orb gradient `#4FFFDB`, `#6AAEF6`, `#8F7AFB`. Add
  checks that `brand.json` and the SVG files describe the same shapes.
- Render every source PNG from the SVGs (`make:sources`, replacing the placeholder generator) and
  regenerate every web, desktop and mobile icon, favicon, splash and notification icon from them:
  the full mark on the app icon, adaptive foreground and splash; the blob alone for the favicons,
  the Android themed icon and the notification icon.
- Draw the in-app mark (`BrandMark`) and wordmark from the new artwork and re-crop the mobile
  account mark. The wordmark's text is set in Poppins Medium (500) at -0.02em, the typeface of
  nurturistai.com's header, self-hosted in `packages/brand` (SIL OFL 1.1) so desktop and mobile
  work offline, with a fallback stack. Only the wordmark changes typeface.
- Export the wordmark as two static SVGs with fixed colours for use outside the app (socials,
  docs, emails): `nurlings-wordmark-light.svg` (navy text) and `nurlings-wordmark-dark.svg` (white).
- Place the Android adaptive foreground and themed icon as large as the 66% safe zone allows, and
  show the splash mark larger (the image is shown 240 points wide).
- Add the two supplied animated marks as plain `<img>` assets: `nurlings-intro.svg` (plays once,
  then idles) on the sign-in screen, the desktop setup screen and the web app's opening screen, and
  `nurlings-loader.svg` (loops) in full loading states (reconnecting, booting the live desktop).
  They sit on the navy plate, honour `prefers-reduced-motion`, and fall back to the static mark.
  Small inline spinners stay as they are.
- Check the Android art against the safe zone and the new files with tests.
- Report, without changing it, what the bot avatar in chat and the sidebar looks like. Redrawing
  it is a separate change and pull request after this merges.
- Internal identifiers stay as they are. Nothing contacts Rakazo-owned infrastructure. `apps/www`
  and the upstream's own artwork are not touched.

## Capabilities

### New Capabilities
- `logo-artwork`: the Nurlings logo artwork as the single source of every icon and in-app mark, and
  the rules the generated files must meet.

### Modified Capabilities
<!-- None. The brand configuration and app identity specs are archived separately; this change adds
     a capability and edits no existing requirement. -->

## Impact

- `packages/brand` (SVG sources, font files and licence, `brand.json`, schema, scripts, checks,
  README), the generated icons under `apps/web/public`, `apps/desktop/assets` and
  `apps/mobile/assets`, `packages/ui-web` (`BrandMark`, `BrandAnimation`, `Wordmark`, font
  stylesheet), `apps/web` (sign-in, opening and loading screens), `apps/desktop` (setup screen
  build), `apps/mobile` (`AppMark` crop, splash width). No new dependency.
- Poppins (SIL Open Font License 1.1) is added as a font file with its licence text beside it.
- One tag, `v0.1.1`, is cut after this change merges so that release ships the real logo.
