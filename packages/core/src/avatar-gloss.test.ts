import { describe, expect, it } from "vitest";
import { avatarGlossPath, svgPathPoints } from "./avatar-geometry.js";
import { organicAvatarPath } from "./avatar-shape.js";
import { organicBotAvatarFrame } from "./bot-avatar-shapes.js";

type Point = readonly [number, number];
const samplePath = (d: string) => svgPathPoints(d);

function inside(polygon: readonly Point[], [x, y]: Point): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]!;
    const [xj, yj] = polygon[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

function distanceToEdge(polygon: readonly Point[], [x, y]: Point): number {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, ay] = polygon[j]!;
    const [bx, by] = polygon[i]!;
    const len2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / len2));
    best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return best;
}

/** The gloss stroke is 4.5 wide, so its centre line must stay at least half of that inside the edge. */
const HALF_STROKE = 2.25;

function expectGlossInside(name: string, body: string, gloss: string) {
  const outline = samplePath(body);
  for (const point of samplePath(gloss)) {
    expect(inside(outline, point), `${name}: ${point.join(",")} is outside`).toBe(true);
    expect(
      distanceToEdge(outline, point),
      `${name}: ${point.join(",")} touches the edge`,
    ).toBeGreaterThanOrEqual(HALF_STROKE);
  }
}

describe("gloss arcs stay inside their body", () => {
  it("holds for Chief, Bean, Drift and Sprout", () => {
    for (const index of [8, 9, 10, 11]) {
      const frame = organicBotAvatarFrame(index)!;
      expectGlossInside(`shape_${index}`, frame.path, frame.gloss ?? avatarGlossPath(frame.path));
    }
  });

  it("holds for every hashed organic family at every phase", () => {
    for (let seed = 0; seed < 360; seed += 1) {
      const body = organicAvatarPath(seed);
      expectGlossInside(`seed ${seed}`, body, avatarGlossPath(body));
    }
  });

  it("gives Chief the storyboard arc", () => {
    expect(organicBotAvatarFrame(8)?.gloss).toBe("M-14 -17 C-11 -24 -5 -27 2 -27");
  });
});
