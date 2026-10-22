/**
 * Writes the PNG SOURCE artwork in packages/brand/assets from the vector sources: the app icon,
 * the transparent mark, the Android layers, the splash, the favicon, the notification icon and the
 * Apple icon layer. Run it after replacing an SVG, then run `export:assets`.
 *
 * Existing files are kept unless `--force` is passed, so a hand-edited PNG is never lost by
 * accident.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { brand } from "../src/index.ts";
import { canvas, faviconSvg, fitInCircle, gradientDefs, markGroup } from "./artwork.ts";

const force = process.argv.includes("--force");
const brandDir = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

const NAVY = brand.colors.iconBackground;
const png = (input: Buffer) => sharp(input).png().toBuffer();
const middle = { x: 512, y: 512 };
// Android keeps adaptive art inside a circle of 66% of the layer (676 of 1024). The mark is drawn
// as large as fits: the smallest circle around it is 672, leaving room for edge anti-aliasing.
const SAFE_DIAMETER = 672;

// The app icon is the supplied square artwork, rendered as is.
const iconSvg = await readFile(brandDir(brand.assets.iconSvg));
const appIcon = await sharp(iconSvg, { density: 144 }).resize(1024, 1024).png().toBuffer();

// The wordmark embeds its typeface so it renders the same wherever the SVG is opened, including
// as an <img>, which cannot load fonts from the page. Poppins Medium: see assets/fonts/OFL.txt.
const font = brand.wordmarkFont;
const fontData = (await readFile(brandDir(font.file))).toString("base64");
const FONT_SIZE = 88;
/** The wordmark in the given colours; `currentColor` lets inline use follow the surrounding text. */
function wordmarkSvg(ink: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="130" viewBox="0 0 680 130" role="img" aria-label="${brand.name}">
  <defs>
    ${gradientDefs()}
    <style>@font-face{font-family:"${font.family}";font-weight:${font.weight};src:url(data:font/woff2;base64,${fontData}) format("woff2")}</style>
  </defs>
  ${markGroup({ x: 90, y: 65, width: 176 }, { blobFill: ink })}
  <text x="200" y="92" font-family="${font.family}, ${font.fallback.replaceAll('"', "'")}" font-size="${FONT_SIZE}" font-weight="${font.weight}" letter-spacing="${(Number.parseFloat(font.letterSpacing) * FONT_SIZE).toFixed(2)}" fill="${ink}">${brand.name}</text>
</svg>
`;
}
const wordmark = wordmarkSvg("currentColor");
// For socials, docs and emails: fixed colours, navy for light backgrounds and white for dark.
const wordmarkLight = wordmarkSvg(brand.colors.iconBackground);
const wordmarkDark = wordmarkSvg(brand.colors.blob);

// Written verbatim (already in the repo's JSON formatting) so regenerating never shows a diff. The
// layer is the full app icon, so the bundle needs no fill of its own.
const ICON_BUNDLE_JSON = `{
  "fill": "automatic",
  "groups": [
    {
      "layers": [
        {
          "glass": false,
          "image-name": "nurlings-mark.png",
          "name": "nurlings-mark"
        }
      ],
      "shadow": {
        "kind": "neutral",
        "opacity": 0.5
      },
      "translucency": {
        "enabled": true,
        "value": 0.5
      }
    }
  ],
  "supported-platforms": {
    "circles": ["watchOS"],
    "squares": "shared"
  }
}
`;

const files: Array<[string, Buffer | string]> = [
  [brand.assets.appIcon, appIcon],
  // The mark on its own, transparent, with a margin.
  [brand.assets.mark, await png(canvas(1024, markGroup({ ...middle, width: 960 })))],
  [brand.assets.wordmark, wordmark],
  [brand.assets.wordmarkLight, wordmarkLight],
  [brand.assets.wordmarkDark, wordmarkDark],
  // Android adaptive layers: the foreground keeps the full mark inside the safe circle, the
  // background is flat navy, and the themed icon is the blob alone in white.
  [
    brand.assets.androidAdaptiveForeground,
    await png(canvas(1024, markGroup(await fitInCircle(middle, SAFE_DIAMETER)))),
  ],
  [
    brand.assets.androidAdaptiveBackground,
    await png(
      canvas(1024, `<rect width="1024" height="1024" fill="${NAVY}"/>`, { gradient: false }),
    ),
  ],
  [
    brand.assets.androidMonochrome,
    await png(
      canvas(
        1024,
        markGroup(await fitInCircle(middle, SAFE_DIAMETER, true), {
          blobOnly: true,
          blobFill: "#FFFFFF",
        }),
        { gradient: false },
      ),
    ),
  ],
  // Notification icons are white silhouettes: the blob alone, filling 64 of 72 pixels.
  [
    brand.assets.androidNotification,
    await png(
      canvas(72, markGroup({ x: 36, y: 36, width: 64 }, { blobOnly: true, blobFill: "#FFFFFF" }), {
        gradient: false,
      }),
    ),
  ],
  // The splash is the mark on the navy splash colour, so it needs no plate of its own. It spans
  // most of the image; the app sets how wide the image is shown.
  [brand.assets.splash, await png(canvas(1024, markGroup({ ...middle, width: 960 })))],
  [brand.assets.favicon, await png(faviconSvg(128))],
  [path.posix.join(brand.assets.appleIcon, "Assets/nurlings-mark.png"), appIcon],
  [path.posix.join(brand.assets.appleIcon, "icon.json"), ICON_BUNDLE_JSON],
];

let written = 0;
for (const [relative, content] of files) {
  const target = brandDir(relative);
  if (existsSync(target) && !force) {
    console.log(`kept    ${relative}`);
    continue;
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content);
  written += 1;
  console.log(`wrote   ${relative}`);
}
console.log(
  written === 0
    ? "Nothing written: every source already exists (use --force to overwrite)."
    : `Wrote ${written} source file(s).`,
);
