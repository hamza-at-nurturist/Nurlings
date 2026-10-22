import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  GENERATED_ICO_FRAMES,
  GENERATED_PNG_SIZES,
  generatedAssetProblems,
  icoFrameSizes,
  pngSize,
  SOURCE_SIZES,
  sourceAssetProblems,
} from "./assets.js";
import { assetsCheck } from "./guard.js";
import { brand } from "./index.js";

const brandDir = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(brandDir, "../..");

/** A minimal PNG header: enough for the size reader and nothing else. */
function fakePng(width: number, height: number): Buffer {
  const bytes = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

describe("pngSize / icoFrameSizes", () => {
  it("reads a PNG header", () => {
    expect(pngSize(fakePng(72, 72))).toEqual([72, 72]);
  });

  it("rejects non-PNG bytes", () => {
    expect(pngSize(Buffer.from("<svg></svg>".padEnd(40)))).toBeUndefined();
    expect(pngSize(Buffer.alloc(4))).toBeUndefined();
  });

  it("reads the frame sizes of a real ICO and treats 0 as 256", async () => {
    const ico = await readFile(path.join(repoRoot, "apps/desktop/assets/icon.ico"));
    expect(icoFrameSizes(ico)).toEqual([16, 32, 48, 64, 128, 256]);
  });

  it("rejects a non-ICO", () => {
    expect(icoFrameSizes(fakePng(16, 16))).toBeUndefined();
  });
});

describe("the repository's artwork", () => {
  it("has every source file at the documented size", async () => {
    expect(await sourceAssetProblems(brandDir, brand)).toEqual([]);
  });

  it("has every generated icon at the documented size", async () => {
    expect(await generatedAssetProblems(repoRoot)).toEqual([]);
  });

  it("passes the guard check", async () => {
    expect(await assetsCheck.run(repoRoot)).toEqual([]);
  });

  it("documents every source and generated file in the README", async () => {
    const readme = await readFile(path.join(brandDir, "README.md"), "utf8");
    const listed = [
      ...Object.keys(SOURCE_SIZES).map((key) => brand.assets[key as keyof typeof brand.assets]),
      ...Object.keys(GENERATED_PNG_SIZES),
      ...Object.keys(GENERATED_ICO_FRAMES),
    ];
    const missing = listed.filter((file) => !readme.includes(`\`${file}`));
    expect(missing).toEqual([]);
  });
});

describe("drop-in replacement guard", () => {
  async function scratchCopy() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "brand-assets-"));
    await cp(path.join(brandDir, "assets"), path.join(dir, "assets"), { recursive: true });
    return dir;
  }

  it("names a replacement that has the wrong size", async () => {
    const dir = await scratchCopy();
    await writeFile(path.join(dir, brand.assets.splash), fakePng(512, 512));
    const problems = await sourceAssetProblems(dir, brand);
    expect(problems).toEqual([
      "packages/brand/assets/splash/splash-icon-1024.png is 512x512; it must be 1024x1024.",
    ]);
    await rm(dir, { recursive: true });
  });

  it("names a missing source and a missing icon bundle layer", async () => {
    const dir = await scratchCopy();
    await rm(path.join(dir, brand.assets.favicon));
    await rm(path.join(dir, brand.assets.appleIcon, "Assets"), { recursive: true });
    const problems = await sourceAssetProblems(dir, brand);
    expect(problems).toContain("packages/brand/assets/favicon/favicon-128.png is missing.");
    expect(problems).toContain(
      "packages/brand/assets/app-icon/Nurlings.icon/Assets/nurlings-mark.png is missing.",
    );
    await rm(dir, { recursive: true });
  });

  it("flags generated files that are missing or the wrong size", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "brand-generated-"));
    await mkdir(path.join(dir, "apps/web/public"), { recursive: true });
    await writeFile(path.join(dir, "apps/web/public/icon-512.png"), fakePng(500, 500));
    const problems = await generatedAssetProblems(dir);
    expect(problems).toContain("apps/web/public/icon-512.png is 500x500; it must be 512x512.");
    expect(problems).toContain("apps/web/public/favicon.ico is missing.");
    // One wrong-size PNG, every other PNG missing, and both ICOs missing.
    expect(problems.length).toBe(
      Object.keys(GENERATED_PNG_SIZES).length + Object.keys(GENERATED_ICO_FRAMES).length,
    );
    await rm(dir, { recursive: true });
  });
});
