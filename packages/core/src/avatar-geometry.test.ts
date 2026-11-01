import { expect, it } from "vitest";
import { avatarGlossPath, avatarPropAnchors, svgPathBounds } from "./avatar-geometry.js";
import { organicAvatarPath } from "./avatar-shape.js";
import { organicBotAvatarFrame } from "./bot-avatar-shapes.js";

it("bounds a path by every coordinate pair", () => {
  expect(svgPathBounds("M-10 -20 C5 5 30 40 12.5 8Z")).toEqual({
    minX: -10,
    minY: -20,
    maxX: 30,
    maxY: 40,
  });
  expect(svgPathBounds("")).toEqual({ minX: -50, minY: -50, maxX: 50, maxY: 50 });
});

it("puts props below, beside and above the body, and the gloss inside its box", () => {
  for (const d of [organicAvatarPath(7), organicBotAvatarFrame(9)!.path]) {
    const b = svgPathBounds(d);
    const a = avatarPropAnchors(b);
    expect(a.pad.y).toBeGreaterThan(b.maxY);
    expect(a.lens.x).toBeGreaterThan(0);
    expect(a.stars.y).toBeLessThan(b.minY);
    const gloss = svgPathBounds(avatarGlossPath(b));
    expect(gloss.minX).toBeGreaterThanOrEqual(b.minX);
    expect(gloss.maxX).toBeLessThanOrEqual(b.maxX);
    expect(gloss.minY).toBeGreaterThanOrEqual(b.minY);
    expect(gloss.maxY).toBeLessThanOrEqual(b.maxY);
  }
});
