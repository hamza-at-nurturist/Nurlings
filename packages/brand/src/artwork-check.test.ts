import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  nonWhitePixels,
  orbColourPixels,
  reach,
  SAFE_DIAMETER,
  sourceSvgProblems,
} from "./artwork-check.js";
import { artworkCheck } from "./guard.js";
import { brand } from "./index.js";

const brandDir = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(brandDir, "../..");

/** A square RGBA image with the given pixels painted, everything else transparent. */
function image(
  size: number,
  paint: Array<[x: number, y: number, rgba: [number, number, number, number]]>,
) {
  const data = Buffer.alloc(size * size * 4);
  for (const [x, y, rgba] of paint) Buffer.from(rgba).copy(data, (y * size + x) * 4);
  return { data, width: size, height: size, channels: 4 };
}

describe("the pixel measures", () => {
  it("measures how far visible pixels reach from the centre and ignores transparent ones", () => {
    const near = image(101, [[50, 55, [255, 255, 255, 255]]]);
    expect(Math.round(reach(near))).toBe(5);
    const far = image(101, [
      [50, 55, [255, 255, 255, 255]],
      [100, 50, [255, 255, 255, 255]],
    ]);
    expect(Math.round(reach(far))).toBe(50);
    expect(reach(image(101, [[100, 50, [255, 255, 255, 0]]]))).toBe(0);
  });

  it("recognises the orb's saturated colours and not navy, white or grey", () => {
    const navy: [number, number, number, number] = [3, 9, 31, 255];
    const mint: [number, number, number, number] = [79, 255, 219, 255];
    const grey: [number, number, number, number] = [180, 180, 180, 255];
    expect(
      orbColourPixels(
        image(4, [
          [0, 0, navy],
          [1, 0, grey],
          [2, 0, [255, 255, 255, 255]],
        ]),
      ),
    ).toBe(0);
    expect(orbColourPixels(image(4, [[0, 0, mint]]))).toBe(1);
  });

  it("counts visible pixels that are not white", () => {
    expect(
      nonWhitePixels(
        image(4, [
          [0, 0, [255, 255, 255, 255]],
          [1, 0, [255, 255, 255, 0]],
        ]),
      ),
    ).toBe(0);
    expect(nonWhitePixels(image(4, [[0, 0, [200, 255, 255, 255]]]))).toBe(1);
  });

  it("uses the platform's 66% safe zone", () => {
    expect(SAFE_DIAMETER).toBe(Math.round(1024 * 0.66));
  });
});

describe("the SVG sources", () => {
  async function scratch() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "brand-svg-"));
    await cp(path.join(brandDir, "assets"), path.join(dir, "assets"), { recursive: true });
    return dir;
  }

  it("match brand.json", async () => {
    expect(await sourceSvgProblems(brandDir, brand)).toEqual([]);
  });

  it("name a source whose blob, orb, gradient or plate was edited", async () => {
    const dir = await scratch();
    const edit = async (relative: string, change: (text: string) => string) => {
      const file = path.join(dir, relative);
      await writeFile(file, change(await readFile(file, "utf8")));
    };
    await edit(brand.assets.markSvg, (text) => text.replace("M1343 1432", "M1343 1433"));
    await edit(brand.assets.iconSvg, (text) => text.replace("#4FFFDB", "#FF0000"));
    await edit(brand.assets.logoSvg, (text) => text.replace('fill="#03091F"', 'fill="#000000"'));
    await edit(brand.assets.markSmallSvg, (text) => text.replace("237 574 1369 898", "0 0 1 1"));
    const problems = (await sourceSvgProblems(dir, brand)).join("\n");
    expect(problems).toContain("nurlings-mark.svg has a blob that differs");
    expect(problems).toContain("nurlings-icon.svg has gradient colours that differ");
    expect(problems).toContain("nurlings-logo.svg has a plate that is not colors.iconBackground");
    expect(problems).toContain("nurlings-mark-small.svg has a viewBox that differs");
    await rm(dir, { recursive: true });
  });
});

describe("the repository's icons", () => {
  it("meet the platform rules", async () => {
    expect(await artworkCheck.run(repoRoot)).toEqual([]);
  });
});
