/**
 * Generates every per-platform icon, favicon, splash and notification file for the web, desktop
 * and mobile apps from the source artwork in packages/brand/assets. Hand-edit the sources, never
 * the generated files. The marketing site (apps/www) is deliberately not touched.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { brand } from "../src/index.ts";

const repoPath = (relative: string) =>
  fileURLToPath(new URL(`../../../${relative}`, import.meta.url));
const assetPath = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));

const PLATE = brand.colors.iconBackground;
const CORNER_RADIUS = 200; // of 1024, shared by every rounded icon

const appIcon = await sharp(assetPath(brand.assets.appIcon)).resize(1024, 1024).png().toBuffer();
const roundedMask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" rx="${CORNER_RADIUS}" fill="white"/></svg>`,
);
const roundedIcon = await sharp(appIcon)
  .composite([{ input: roundedMask, blend: "dest-in" }])
  .png()
  .toBuffer();

const written: string[] = [];
async function write(relative: string, bytes: Buffer) {
  const target = repoPath(relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  written.push(relative);
}
async function resized(input: Buffer, size: number) {
  return sharp(input).resize(size, size).png().toBuffer();
}
/** Re-encodes a source file so generated copies are normalised PNGs. */
const copyOf = (relative: string) => sharp(assetPath(relative)).png().toBuffer();

// An ICO is a header plus PNG frames, which Windows and browsers both accept.
async function ico(input: Buffer, sizes: number[]) {
  const frames = await Promise.all(sizes.map((size) => resized(input, size)));
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    const size = sizes[index] ?? 0;
    header[entry] = header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  return Buffer.concat([header, ...frames]);
}

// Web app: square touch icons, rounded favicons.
const web = "apps/web/public";
await write(`${web}/favicon-16x16.png`, await resized(roundedIcon, 16));
await write(`${web}/favicon-32x32.png`, await resized(roundedIcon, 32));
await write(`${web}/favicon.png`, await copyOf(brand.assets.favicon));
await write(`${web}/apple-touch-icon.png`, await resized(appIcon, 180));
await write(`${web}/icon-192.png`, await resized(appIcon, 192));
await write(`${web}/icon-512.png`, await resized(appIcon, 512));
await write(`${web}/favicon.ico`, await ico(roundedIcon, [16, 32, 48]));

// Desktop: opaque square, rounded macOS development icon, Windows ICO.
await write("apps/desktop/assets/icon.png", appIcon);
await write("apps/desktop/assets/icon-macos.png", roundedIcon);
await write("apps/desktop/assets/icon.ico", await ico(roundedIcon, [16, 32, 48, 64, 128, 256]));

// Mobile: iOS and the Android legacy icon must be opaque; adaptive layers keep their alpha.
const mobile = "apps/mobile/assets";
const opaque = (input: Buffer) =>
  sharp(input).flatten({ background: PLATE }).removeAlpha().png().toBuffer();
await write(`${mobile}/icon.png`, await opaque(appIcon));
await write(`${mobile}/adaptive-icon.png`, await copyOf(brand.assets.androidAdaptiveForeground));
await write(
  `${mobile}/icon-background.png`,
  await opaque(await copyOf(brand.assets.androidAdaptiveBackground)),
);
await write(`${mobile}/monochrome-icon.png`, await copyOf(brand.assets.androidMonochrome));
await write(`${mobile}/notification-icon.png`, await copyOf(brand.assets.androidNotification));
await write(`${mobile}/splash-icon.png`, await copyOf(brand.assets.splash));
await write(`${mobile}/favicon.png`, await copyOf(brand.assets.favicon));

for (const relative of written) console.log(`wrote ${relative}`);
console.log(`Generated ${written.length} files from packages/brand/assets.`);
