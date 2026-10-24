import { brand } from "@nurlings/brand";
import { describe, expect, it } from "vitest";
import { parseViewBox, pathBottomCenter, pathCenter, subpaths } from "./brand-splash-geometry";
import {
  CHIEF_BLINK,
  CHIEF_BODY,
  CHIEF_LOOK,
  EASE_IN_OUT,
  EXIT_MS,
  exitTiming,
  FADE_MS,
  MS_PER_PERCENT,
  ORB_BODY,
  ORB_OPACITY,
  planSplash,
  SHORT_END,
  sampleTrack,
} from "./brand-splash-timeline";

describe("sampleTrack", () => {
  it("returns the first row before the track and the last after it", () => {
    expect(sampleTrack(CHIEF_BODY, -5, EASE_IN_OUT)).toEqual([60, 0.04, 0.04, 0]);
    expect(sampleTrack(CHIEF_BODY, 100, EASE_IN_OUT)).toEqual([0, 1, 1, 0]);
  });

  it("hits a keyframe exactly", () => {
    expect(sampleTrack(CHIEF_BODY, 4.5, EASE_IN_OUT)).toEqual([0, 1.2, 0.78, -3]);
    expect(sampleTrack(ORB_BODY, 72, EASE_IN_OUT)).toEqual([-300, 0.92, 1.1, 0]);
  });

  it("is halfway between two keyframes at the middle of an eased segment", () => {
    const [y] = sampleTrack(CHIEF_LOOK, 23, EASE_IN_OUT).slice(1);
    expect(y).toBeCloseTo(-7, 5);
    expect(sampleTrack(CHIEF_BLINK, 17.3, EASE_IN_OUT)[0]).toBeCloseTo(0.1, 5);
  });

  it("holds Chief at rest between the enter and the hop", () => {
    expect(sampleTrack(CHIEF_BODY, 40, EASE_IN_OUT)).toEqual([0, 1, 1, 0]);
    expect(sampleTrack(ORB_OPACITY, 9, EASE_IN_OUT)[0]).toBeCloseTo(0.5, 5);
  });
});

describe("planSplash", () => {
  const base = { ready: false, skipped: false };

  it("plays the full run to 82% and then idles until the app is ready", () => {
    expect(planSplash({ ...base, mode: "full", elapsedMs: 1000 })).toEqual({
      phase: "playing",
      recheckInMs: 3920,
    });
    expect(planSplash({ ...base, mode: "full", elapsedMs: 4920 })).toEqual({ phase: "idle" });
    expect(planSplash({ ...base, mode: "full", elapsedMs: 9000 })).toEqual({ phase: "idle" });
  });

  it("starts the full exit at 84% when the app was ready early, or at once when it was late", () => {
    expect(planSplash({ ...base, ready: true, mode: "full", elapsedMs: 1000 })).toEqual({
      phase: "playing",
      recheckInMs: 4040,
    });
    expect(planSplash({ ...base, ready: true, mode: "full", elapsedMs: 5040 })).toEqual({
      phase: "exit",
    });
    expect(planSplash({ ...base, ready: true, mode: "full", elapsedMs: 8000 })).toEqual({
      phase: "exit",
    });
  });

  it("always plays the short pop-in before exiting, even when the app was ready at once", () => {
    expect(planSplash({ ...base, ready: true, mode: "short", elapsedMs: 0 })).toEqual({
      phase: "playing",
      recheckInMs: 1740,
    });
    expect(planSplash({ ...base, ready: true, mode: "short", elapsedMs: 1740 })).toEqual({
      phase: "exit",
    });
    expect(planSplash({ ...base, mode: "short", elapsedMs: 500 }).phase).toBe("playing");
    expect(planSplash({ ...base, mode: "short", elapsedMs: 1800 })).toEqual({ phase: "idle" });
    expect(planSplash({ ...base, ready: true, mode: "short", elapsedMs: 4000 })).toEqual({
      phase: "exit",
    });
  });

  it("keeps a ready short launch to about 2-2.3 s, and the full and static exits unchanged", () => {
    const short = exitTiming("short");
    const shortTotal =
      SHORT_END * MS_PER_PERCENT + Math.max(short.exitMs, short.fadeAtMs + FADE_MS);
    expect(shortTotal).toBeGreaterThanOrEqual(2000);
    expect(shortTotal).toBeLessThanOrEqual(2300);
    expect(exitTiming("full")).toEqual({ exitMs: 900, fadeAtMs: 900 });
    expect(exitTiming("static")).toEqual({ exitMs: 0, fadeAtMs: 0 });
  });

  it("exits on a tap in every mode", () => {
    for (const mode of ["full", "short", "static"] as const) {
      expect(planSplash({ mode, elapsedMs: 10, ready: false, skipped: true })).toEqual({
        phase: "exit",
      });
    }
  });

  it("shows the static mark for at least 600 ms", () => {
    expect(planSplash({ ...base, ready: true, mode: "static", elapsedMs: 200 })).toEqual({
      phase: "playing",
      recheckInMs: 400,
    });
    expect(planSplash({ ...base, ready: true, mode: "static", elapsedMs: 600 })).toEqual({
      phase: "exit",
    });
    expect(planSplash({ ...base, mode: "static", elapsedMs: 5000 }).phase).toBe("playing");
  });

  it("has a 900 ms exit", () => {
    expect(EXIT_MS).toBe(900);
  });
});

describe("mark geometry", () => {
  const blob = subpaths(brand.mark.blob) as [string, string, string];
  const orb = subpaths(brand.mark.orb) as [string, string, string];
  const [x, y, w, h] = parseViewBox(brand.mark.viewBox);

  it("splits the body from its two eyes, for Chief and for the orb", () => {
    expect(blob).toHaveLength(3);
    expect(orb).toHaveLength(3);
  });

  it("finds pivots inside the view box", () => {
    for (const point of [
      pathBottomCenter(blob[0]),
      pathCenter(blob[1]),
      pathCenter(blob[2]),
      pathCenter(orb[1]),
      pathCenter(orb[2]),
    ]) {
      expect(point.x).toBeGreaterThan(x);
      expect(point.x).toBeLessThan(x + w);
      expect(point.y).toBeGreaterThan(y);
      expect(point.y).toBeLessThan(y + h);
    }
    expect(pathBottomCenter(blob[0]).y).toBeGreaterThan(1400);
  });

  it("puts Chief's second eye to the right of the first", () => {
    expect(pathCenter(blob[2]).x).toBeGreaterThan(pathCenter(blob[1]).x);
  });
});
