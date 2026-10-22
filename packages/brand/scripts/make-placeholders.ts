/**
 * Writes the placeholder SOURCE artwork into packages/brand/assets. They are plain vector "N"
 * tiles so they are obviously temporary and share nothing with any upstream artwork.
 *
 * Once real artwork has been dropped in, this must never overwrite it, so existing files are kept
 * unless `--force` is passed. After changing a source, run `pnpm --filter @nurlings/brand
 * export:assets` to regenerate the per-platform files.
 */
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { brand } from "../src/index.ts";

const force = process.argv.includes("--force");
const brandDir = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

// The mark is defined once, in brand.json, and also drawn by the app's logo component. The
// placeholder geometry is a plain "N" centred in a 1024 box (424 wide, 500 tall).
const GLYPH = brand.mark.path;
const INK = brand.colors.themeLight;
const PLATE = brand.colors.iconBackground;
const PLATE_RADIUS = 200;

function svg(size: number, body: string, viewBox = "0 0 1024 1024") {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}">${body}</svg>`,
  );
}
const glyph = (fill: string, scale = 1) =>
  `<path d="${GLYPH}" fill="${fill}" transform="translate(512 512) scale(${scale}) translate(-512 -512)"/>`;
const plate = (rounded: boolean) =>
  `<rect width="1024" height="1024" ${rounded ? `rx="${PLATE_RADIUS}" ` : ""}fill="${PLATE}"/>`;
const png = (input: Buffer) => sharp(input).png().toBuffer();

// Written verbatim (already in the repo's JSON formatting) so regenerating never shows a diff.
const ICON_BUNDLE_JSON = `{
  "fill": "system-dark",
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

const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="130" viewBox="0 0 440 130" role="img" aria-label="${brand.name}">
  <text x="0" y="96" font-family="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif" font-size="104" font-weight="600" letter-spacing="-2" fill="currentColor">${brand.name}</text>
</svg>
`;

const files: Array<[string, Buffer | string]> = [
  [brand.assets.mark, await png(svg(1024, glyph(INK)))],
  [brand.assets.wordmark, wordmark],
  [brand.assets.appIcon, await png(svg(1024, plate(false) + glyph(INK)))],
  // Android keeps adaptive art inside the central 66% safe zone, hence the 0.85 scale.
  [brand.assets.androidAdaptiveForeground, await png(svg(1024, glyph(INK, 0.85)))],
  [brand.assets.androidAdaptiveBackground, await png(svg(1024, plate(false)))],
  [brand.assets.androidMonochrome, await png(svg(1024, glyph("#FFFFFF", 0.85)))],
  [brand.assets.androidNotification, await png(svg(72, glyph("#FFFFFF"), "200 200 624 624"))],
  // The splash shows a plate, so it reads on both the light and the dark splash colour.
  [
    brand.assets.splash,
    await png(
      svg(
        1024,
        `<g transform="translate(512 512) scale(0.6055) translate(-512 -512)">${plate(true)}${glyph(INK)}</g>`,
      ),
    ),
  ],
  [brand.assets.favicon, await png(svg(128, plate(true) + glyph(INK)))],
  [
    path.posix.join(brand.assets.appleIcon, "Assets/nurlings-mark.png"),
    await png(svg(1024, glyph(INK))),
  ],
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
    : `Wrote ${written} placeholder file(s).`,
);
