import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { Brand } from "./schema.js";

/**
 * Checks on the logo artwork that go beyond file sizes: the SVG sources must describe the shapes
 * and colours in `brand.json`, the app icon must be a render of its SVG, the Android layers must
 * stay inside the adaptive safe zone, the opaque icons must be opaque, and the small icons must
 * show the blob alone. It reads pixels, so it needs `sharp` and is not exported from the package.
 */

/** Android's adaptive safe zone: a circle of 66% of the 1024 pixel layer. */
export const SAFE_DIAMETER = 676;
/** The Android art must fill at least this share of the safe radius, so it is not left small. */
export const MIN_SAFE_FILL = 0.95;

const attribute = (tag: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

interface ParsedSvg {
  viewBox?: string;
  paths: { fill?: string; d?: string }[];
  gradient?: { x1: number; y1: number; x2: number; y2: number; stops: string[] };
  plate?: string;
}

function parseSvg(text: string): ParsedSvg {
  const svgTag = /<svg\b[^>]*>/.exec(text)?.[0] ?? "";
  const paths = [...text.matchAll(/<path\b[^>]*>/g)].map((match) => ({
    fill: attribute(match[0], "fill"),
    d: attribute(match[0], "d"),
  }));
  const gradientTag = /<linearGradient\b[^>]*>/.exec(text)?.[0];
  const gradient = gradientTag
    ? {
        x1: Number(attribute(gradientTag, "x1")),
        y1: Number(attribute(gradientTag, "y1")),
        x2: Number(attribute(gradientTag, "x2")),
        y2: Number(attribute(gradientTag, "y2")),
        stops: [...text.matchAll(/<stop\b[^>]*>/g)].map(
          (match) => attribute(match[0], "stop-color") ?? "",
        ),
      }
    : undefined;
  const rect = /<rect\b[^>]*>/.exec(text)?.[0];
  return {
    viewBox: attribute(svgTag, "viewBox"),
    paths,
    gradient,
    plate: rect ? attribute(rect, "fill") : undefined,
  };
}

const same = (a: string | undefined, b: string) => a?.toLowerCase() === b.toLowerCase();

/** `brand.json` and the SVG sources describe the same shapes, viewBoxes and colours. */
export async function sourceSvgProblems(brandDir: string, brand: Brand): Promise<string[]> {
  const problems: string[] = [];
  const read = async (relative: string) =>
    parseSvg(await readFile(path.join(brandDir, relative), "utf8"));
  const label = (relative: string) => `packages/brand/${relative}`;

  const full = await read(brand.assets.markSvg);
  const small = await read(brand.assets.markSmallSvg);
  const icon = await read(brand.assets.iconSvg);
  const logo = await read(brand.assets.logoSvg);

  const blobOf = (svg: ParsedSvg) => svg.paths[0];
  const orbOf = (svg: ParsedSvg) => svg.paths[1];
  const shapeProblems = (svg: ParsedSvg, relative: string, withOrb: boolean) => {
    if (blobOf(svg)?.d !== brand.mark.blob || !same(blobOf(svg)?.fill, brand.colors.blob)) {
      problems.push(
        `${label(relative)} has a blob that differs from brand.json (mark.blob, colors.blob).`,
      );
    }
    if (withOrb && orbOf(svg)?.d !== brand.mark.orb) {
      problems.push(`${label(relative)} has an orb that differs from brand.json (mark.orb).`);
    }
    if (withOrb && svg.gradient) {
      const g = svg.gradient;
      const want = brand.mark.orbGradient;
      if (g.x1 !== want.x1 || g.y1 !== want.y1 || g.x2 !== want.x2 || g.y2 !== want.y2) {
        problems.push(
          `${label(relative)} has a gradient that differs from brand.json (mark.orbGradient).`,
        );
      }
      if (g.stops.join().toLowerCase() !== brand.colors.orbGradient.join().toLowerCase()) {
        problems.push(
          `${label(relative)} has gradient colours that differ from brand.json (colors.orbGradient).`,
        );
      }
    } else if (withOrb) {
      problems.push(`${label(relative)} has no orb gradient.`);
    }
  };

  shapeProblems(full, brand.assets.markSvg, true);
  shapeProblems(small, brand.assets.markSmallSvg, false);
  shapeProblems(icon, brand.assets.iconSvg, true);
  shapeProblems(logo, brand.assets.logoSvg, true);
  if (full.viewBox !== brand.mark.viewBox) {
    problems.push(
      `${label(brand.assets.markSvg)} has a viewBox that differs from brand.json (mark.viewBox).`,
    );
  }
  if (small.viewBox !== brand.mark.smallViewBox) {
    problems.push(
      `${label(brand.assets.markSmallSvg)} has a viewBox that differs from brand.json (mark.smallViewBox).`,
    );
  }
  for (const [svg, relative] of [
    [icon, brand.assets.iconSvg],
    [logo, brand.assets.logoSvg],
  ] as const) {
    if (!same(svg.plate, brand.colors.iconBackground)) {
      problems.push(`${label(relative)} has a plate that is not colors.iconBackground.`);
    }
  }
  return problems;
}

interface Pixels {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

async function pixels(file: string): Promise<Pixels> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

const alphaAt = (p: Pixels, index: number) => p.data[index * p.channels + 3] ?? 0;

/** Largest distance from the centre of any visible pixel, in pixels. */
export function reach(p: Pixels): number {
  let farthest = 0;
  const cx = (p.width - 1) / 2;
  const cy = (p.height - 1) / 2;
  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      if (alphaAt(p, y * p.width + x) > 8)
        farthest = Math.max(farthest, Math.hypot(x - cx, y - cy));
    }
  }
  return farthest;
}

/** The share of visible pixels that are saturated and bright: the orb's colours, not navy or white. */
export function orbColourPixels(p: Pixels): number {
  let count = 0;
  for (let i = 0; i < p.width * p.height; i += 1) {
    const o = i * p.channels;
    const [r = 0, g = 0, b = 0] = [p.data[o], p.data[o + 1], p.data[o + 2]];
    if (
      alphaAt(p, i) > 200 &&
      Math.max(r, g, b) > 110 &&
      Math.max(r, g, b) - Math.min(r, g, b) > 70
    ) {
      count += 1;
    }
  }
  return count;
}

/** Visible pixels that are not white. */
export function nonWhitePixels(p: Pixels): number {
  let count = 0;
  for (let i = 0; i < p.width * p.height; i += 1) {
    const o = i * p.channels;
    if (
      alphaAt(p, i) > 8 &&
      ((p.data[o] ?? 0) < 245 || (p.data[o + 1] ?? 0) < 245 || (p.data[o + 2] ?? 0) < 245)
    ) {
      count += 1;
    }
  }
  return count;
}

/** Pixel-level rules for the generated and source icons. */
export async function iconPixelProblems(
  repoRoot: string,
  brandDir: string,
  brand: Brand,
): Promise<string[]> {
  const problems: string[] = [];
  const brandFile = (relative: string) => path.join(brandDir, relative);
  const repoFile = (relative: string) => path.join(repoRoot, relative);

  // Android adaptive layers keep their art inside the safe circle.
  for (const [file, name] of [
    [brandFile(brand.assets.androidAdaptiveForeground), "adaptive foreground"],
    [brandFile(brand.assets.androidMonochrome), "themed icon"],
    [repoFile("apps/mobile/assets/adaptive-icon.png"), "adaptive foreground (generated)"],
    [repoFile("apps/mobile/assets/monochrome-icon.png"), "themed icon (generated)"],
  ] as const) {
    const found = reach(await pixels(file));
    if (found > SAFE_DIAMETER / 2) {
      problems.push(
        `The Android ${name} reaches ${Math.round(found)} pixels from the centre; the safe zone is ${SAFE_DIAMETER / 2}.`,
      );
    } else if (found < (SAFE_DIAMETER / 2) * MIN_SAFE_FILL) {
      problems.push(
        `The Android ${name} reaches only ${Math.round(found)} pixels from the centre; it should fill the safe zone (${SAFE_DIAMETER / 2}).`,
      );
    }
  }

  // The launcher icons must have no transparency.
  for (const file of [
    brandFile(brand.assets.appIcon),
    brandFile(brand.assets.androidAdaptiveBackground),
    repoFile("apps/mobile/assets/icon.png"),
    repoFile("apps/mobile/assets/icon-background.png"),
    repoFile("apps/desktop/assets/icon.png"),
  ]) {
    const meta = await sharp(file).metadata();
    const { data, info } = await sharp(file)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let see = 0;
    for (let i = 3; i < data.length; i += info.channels) if ((data[i] ?? 255) < 255) see += 1;
    if (meta.hasAlpha && see > 0) {
      problems.push(`${path.relative(repoRoot, file)} has transparent pixels; it must be opaque.`);
    }
  }

  // Small icons show the blob alone: no orb colours.
  for (const file of [
    repoFile("apps/web/public/favicon-16x16.png"),
    repoFile("apps/web/public/favicon-32x32.png"),
    repoFile("apps/web/public/favicon.png"),
    repoFile("apps/mobile/assets/favicon.png"),
  ]) {
    if (orbColourPixels(await pixels(file)) > 0) {
      problems.push(`${path.relative(repoRoot, file)} shows the orb; favicons use the blob alone.`);
    }
  }
  for (const file of [
    brandFile(brand.assets.androidMonochrome),
    brandFile(brand.assets.androidNotification),
  ]) {
    if (nonWhitePixels(await pixels(file)) > 0) {
      problems.push(`${path.relative(repoRoot, file)} must be white on transparent.`);
    }
  }

  // The app icon source is a render of its SVG, so an edited SVG cannot leave a stale icon.
  const rendered = await sharp(brandFile(brand.assets.iconSvg), { density: 144 })
    .resize(1024, 1024)
    .ensureAlpha()
    .raw()
    .toBuffer();
  const actual = await sharp(brandFile(brand.assets.appIcon)).ensureAlpha().raw().toBuffer();
  let total = 0;
  for (let i = 0; i < rendered.length; i += 1)
    total += Math.abs((rendered[i] ?? 0) - (actual[i] ?? 0));
  if (rendered.length !== actual.length || total / rendered.length > 1) {
    problems.push(
      `packages/brand/${brand.assets.appIcon} is not a render of ${brand.assets.iconSvg}; run make:sources --force and export:assets.`,
    );
  }
  return problems;
}

/** The animated marks are plain images: they must hold the brand's blob, respect reduced motion and run no script. */
export async function animatedSvgProblems(brandDir: string, brand: Brand): Promise<string[]> {
  const problems: string[] = [];
  for (const relative of [brand.assets.introSvg, brand.assets.loaderSvg]) {
    const text = await readFile(path.join(brandDir, relative), "utf8");
    const label = `packages/brand/${relative}`;
    // The animations draw the blob and the eyes as separate shapes, so compare each sub-path.
    const subpaths = [brand.mark.blob, brand.mark.orb]
      .flatMap((path) => path.split(/(?<=Z)/).filter(Boolean))
      .filter((subpath) => !subpath.includes("A190.6 190.6"));
    const missing = subpaths.filter((subpath) => !text.includes(`d="${subpath}"`));
    if (missing.length > 0) {
      problems.push(`${label} does not draw the blob and eyes from brand.json (mark).`);
    }
    for (const stop of brand.colors.orbGradient) {
      if (!text.toLowerCase().includes(stop.toLowerCase())) {
        problems.push(`${label} is missing the orb gradient colour ${stop}.`);
      }
    }
    if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(text)) {
      problems.push(`${label} must switch its animation off for prefers-reduced-motion.`);
    }
    if (/<script|\bon\w+\s*=|href\s*=\s*["']?https?:/i.test(text)) {
      problems.push(`${label} must not contain script, event handlers or external links.`);
    }
  }
  return problems;
}

/** The self-hosted wordmark font is present, declared in its stylesheet and licensed. */
export async function wordmarkFontProblems(brandDir: string, brand: Brand): Promise<string[]> {
  const problems: string[] = [];
  const css = await readFile(path.join(brandDir, brand.wordmarkFont.css), "utf8");
  const file = path.basename(brand.wordmarkFont.file);
  if (!css.includes(`"${brand.wordmarkFont.family}"`) || !css.includes(file)) {
    problems.push(
      `${brand.wordmarkFont.css} must declare ${brand.wordmarkFont.family} from ${file}.`,
    );
  }
  if (!new RegExp(`font-weight:\\s*${brand.wordmarkFont.weight}\\b`).test(css)) {
    problems.push(`${brand.wordmarkFont.css} must declare weight ${brand.wordmarkFont.weight}.`);
  }
  const bytes = await readFile(path.join(brandDir, brand.wordmarkFont.file));
  if (bytes.subarray(0, 4).toString("latin1") !== "wOF2") {
    problems.push(`${brand.wordmarkFont.file} is not a WOFF2 file.`);
  }
  const license = await readFile(
    path.join(path.dirname(path.join(brandDir, brand.wordmarkFont.file)), "OFL.txt"),
    "utf8",
  ).catch(() => "");
  if (!license.includes("SIL OPEN FONT LICENSE")) {
    problems.push("The font's licence (OFL.txt) must sit beside it.");
  }
  for (const relative of [
    brand.assets.wordmark,
    brand.assets.wordmarkLight,
    brand.assets.wordmarkDark,
  ]) {
    const wordmark = await readFile(path.join(brandDir, relative), "utf8");
    if (!wordmark.includes("font/woff2;base64,") || !wordmark.includes(brand.wordmarkFont.family)) {
      problems.push(
        `${relative} must embed ${brand.wordmarkFont.family}; run make:sources --force.`,
      );
    }
  }
  // The exports for use outside the app have fixed colours: navy text for light backgrounds,
  // white for dark ones, and nothing that depends on the surrounding text colour.
  for (const [relative, ink] of [
    [brand.assets.wordmarkLight, brand.colors.iconBackground],
    [brand.assets.wordmarkDark, brand.colors.blob],
  ] as const) {
    const text = await readFile(path.join(brandDir, relative), "utf8");
    if (/currentColor/i.test(text)) {
      problems.push(`${relative} must use fixed colours, not currentColor.`);
    }
    if (!new RegExp(`<text[^>]*fill="${ink}"`, "i").test(text)) {
      problems.push(`${relative} must set its text in ${ink}.`);
    }
  }
  return problems;
}
