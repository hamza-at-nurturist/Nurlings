import { BOT_AVATAR_SHAPE_COUNT } from "@rakazo/contracts";
import { describe, expect, it } from "vitest";
import {
  SHIPPED_BOT_AVATAR_CENTER,
  SHIPPED_BOT_AVATAR_SHAPE_KEYS,
  SHIPPED_BOT_AVATAR_SHAPES,
  shippedBotAvatarEyes,
  shippedBotAvatarShapePath,
} from "./bot-avatar-shapes.js";

/** The bounding box of an M/C/Z path, sampling each cubic. */
function pathBounds(d: string) {
  const xs: number[] = [];
  const ys: number[] = [];
  let current = [0, 0] as [number, number];
  for (const segment of d.match(/[MCZ][^MCZ]*/g) ?? []) {
    const n = (segment.slice(1).match(/-?\d*\.?\d+/g) ?? []).map(Number);
    if (segment[0] === "M") {
      current = [n[0] ?? 0, n[1] ?? 0];
      xs.push(current[0]);
      ys.push(current[1]);
    } else if (segment[0] === "C") {
      for (let i = 0; i + 5 < n.length; i += 6) {
        const [x0, y0] = current;
        const [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6) as number[] &
          [number, number, number, number, number, number];
        for (let k = 1; k <= 40; k++) {
          const t = k / 40;
          const u = 1 - t;
          xs.push(u ** 3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3);
          ys.push(u ** 3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3);
        }
        current = [x3, y3];
      }
    }
  }
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

describe("shipped bot avatar shapes", () => {
  it("keeps the same shapes the parser encodes", () => {
    expect(SHIPPED_BOT_AVATAR_SHAPE_KEYS).toHaveLength(BOT_AVATAR_SHAPE_COUNT);
    expect(shippedBotAvatarShapePath(3)).toBe(SHIPPED_BOT_AVATAR_SHAPES.tablet);
    expect(shippedBotAvatarShapePath(3)).not.toBe(shippedBotAvatarShapePath(0));
    expect(shippedBotAvatarShapePath(12)).toBe(shippedBotAvatarShapePath(3));
  });

  it("emits path geometry only", () => {
    for (const key of SHIPPED_BOT_AVATAR_SHAPE_KEYS) {
      const path = SHIPPED_BOT_AVATAR_SHAPES[key] ?? "";
      expect(path).toMatch(/^M/);
      expect(path).not.toMatch(/<|>|javascript:|url\(/i);
    }
  });

  it("draws the brand blob as the last shape, centred in the shape box like the others", () => {
    const index = SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling");
    expect(index).toBe(SHIPPED_BOT_AVATAR_SHAPE_KEYS.length - 1);
    const bounds = pathBounds(shippedBotAvatarShapePath(index));
    expect((bounds.minX + bounds.maxX) / 2).toBeCloseTo(SHIPPED_BOT_AVATAR_CENTER, 0);
    expect((bounds.minY + bounds.maxY) / 2).toBeCloseTo(SHIPPED_BOT_AVATAR_CENTER, 0);
    expect(bounds.maxX - bounds.minX).toBeCloseTo(228, 0);
    expect(bounds.minX).toBeGreaterThanOrEqual(-15);
    expect(bounds.maxX).toBeLessThanOrEqual(244);
  });

  it("keeps ellipse eyes on the old shapes and slanted pills on the brand blob", () => {
    expect(shippedBotAvatarEyes(0)).toMatchObject({ kind: "ellipse", rx: 10, ry: 7, tiltDeg: 0 });
    const index = SHIPPED_BOT_AVATAR_SHAPE_KEYS.indexOf("nurling");
    const eyes = shippedBotAvatarEyes(index);
    expect(eyes).toMatchObject({ kind: "pill", tiltDeg: 13.5 });
    expect(eyes.ry).toBeGreaterThan(eyes.rx * 2);
    const bounds = pathBounds(shippedBotAvatarShapePath(index));
    for (const eye of [eyes.left, eyes.right]) {
      expect(eye.cx).toBeGreaterThan(bounds.minX);
      expect(eye.cx).toBeLessThan(bounds.maxX);
      expect(eye.cy - eyes.ry).toBeGreaterThan(bounds.minY);
    }
  });
});
