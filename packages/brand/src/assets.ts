import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { Brand } from "./schema.js";

/**
 * The sizes each platform needs. This is the single source for the README table, the guard that
 * keeps designers' drop-in files honest, and the check on the generated files.
 */
export type Size = readonly [width: number, height: number];

/** Source artwork in packages/brand/assets, keyed like `brand.assets`. `null` is not a PNG. */
export const SOURCE_SIZES: Record<keyof Brand["assets"], Size | null> = {
  mark: [1024, 1024],
  wordmark: null,
  appIcon: [1024, 1024],
  appleIcon: null,
  androidAdaptiveForeground: [1024, 1024],
  androidAdaptiveBackground: [1024, 1024],
  androidMonochrome: [1024, 1024],
  androidNotification: [72, 72],
  splash: [1024, 1024],
  favicon: [128, 128],
};

/** Files `export:assets` writes, relative to the repository root. */
export const GENERATED_PNG_SIZES: Record<string, Size> = {
  "apps/web/public/favicon-16x16.png": [16, 16],
  "apps/web/public/favicon-32x32.png": [32, 32],
  "apps/web/public/favicon.png": [128, 128],
  "apps/web/public/apple-touch-icon.png": [180, 180],
  "apps/web/public/icon-192.png": [192, 192],
  "apps/web/public/icon-512.png": [512, 512],
  "apps/desktop/assets/icon.png": [1024, 1024],
  "apps/desktop/assets/icon-macos.png": [1024, 1024],
  "apps/mobile/assets/icon.png": [1024, 1024],
  "apps/mobile/assets/adaptive-icon.png": [1024, 1024],
  "apps/mobile/assets/icon-background.png": [1024, 1024],
  "apps/mobile/assets/monochrome-icon.png": [1024, 1024],
  "apps/mobile/assets/notification-icon.png": [72, 72],
  "apps/mobile/assets/splash-icon.png": [1024, 1024],
  "apps/mobile/assets/favicon.png": [128, 128],
};

/** ICO files and the frame sizes each must contain. */
export const GENERATED_ICO_FRAMES: Record<string, readonly number[]> = {
  "apps/web/public/favicon.ico": [16, 32, 48],
  "apps/desktop/assets/icon.ico": [16, 32, 48, 64, 128, 256],
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function pngSize(bytes: Buffer): Size | undefined {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return undefined;
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

export function icoFrameSizes(bytes: Buffer): number[] | undefined {
  if (bytes.length < 6 || bytes.readUInt16LE(0) !== 0 || bytes.readUInt16LE(2) !== 1) {
    return undefined;
  }
  const count = bytes.readUInt16LE(4);
  return Array.from({ length: count }, (_, index) => bytes[6 + index * 16] || 256);
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(
    () => true,
    () => false,
  );
}

async function expectPng(file: string, label: string, size: Size): Promise<string[]> {
  if (!(await exists(file))) return [`${label} is missing.`];
  const actual = pngSize(await readFile(file));
  if (!actual) return [`${label} is not a PNG file.`];
  return actual[0] === size[0] && actual[1] === size[1]
    ? []
    : [`${label} is ${actual[0]}x${actual[1]}; it must be ${size[0]}x${size[1]}.`];
}

/** Source artwork exists at the sizes in `SOURCE_SIZES` (so a drop-in replacement cannot be the wrong size). */
export async function sourceAssetProblems(brandDir: string, brand: Brand): Promise<string[]> {
  const problems: string[] = [];
  for (const key of Object.keys(SOURCE_SIZES) as Array<keyof Brand["assets"]>) {
    const relative = brand.assets[key];
    const file = path.join(brandDir, relative);
    const size = SOURCE_SIZES[key];
    if (size) {
      problems.push(...(await expectPng(file, `packages/brand/${relative}`, size)));
    } else if (!(await exists(file))) {
      problems.push(`packages/brand/${relative} is missing.`);
    }
  }
  const bundle = path.join(brandDir, brand.assets.appleIcon);
  for (const required of ["icon.json", "Assets/nurlings-mark.png"]) {
    if (!(await exists(path.join(bundle, required)))) {
      problems.push(`packages/brand/${brand.assets.appleIcon}/${required} is missing.`);
    }
  }
  return problems;
}

/** The files `export:assets` writes exist at the documented sizes. */
export async function generatedAssetProblems(repoRoot: string): Promise<string[]> {
  const problems: string[] = [];
  for (const [relative, size] of Object.entries(GENERATED_PNG_SIZES)) {
    problems.push(...(await expectPng(path.join(repoRoot, relative), relative, size)));
  }
  for (const [relative, expected] of Object.entries(GENERATED_ICO_FRAMES)) {
    const file = path.join(repoRoot, relative);
    if (!(await exists(file))) {
      problems.push(`${relative} is missing.`);
      continue;
    }
    const frames = icoFrameSizes(await readFile(file));
    if (!frames || frames.join() !== expected.join()) {
      problems.push(`${relative} must contain frames ${expected.join(", ")}.`);
    }
  }
  return problems;
}
