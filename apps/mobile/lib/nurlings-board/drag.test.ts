import { describe, expect, it } from "vitest";
import type { PagerLayout } from "./drag";
import { columnAt, edgeScrollSpeed, maxPagerOffset, snapOffset } from "./drag";

// Pages 300 wide, 10 apart, 16 of padding: page 0 spans 16-316, page 1 326-626, and so on.
const layout: PagerLayout = { pageWidth: 300, gap: 10, edge: 16, count: 6 };

describe("columnAt", () => {
  it("finds the column under the finger", () => {
    expect(columnAt(20, 0, layout)).toBe(0);
    expect(columnAt(315, 0, layout)).toBe(0);
    expect(columnAt(330, 0, layout)).toBe(1);
  });

  it("accounts for the scroll offset", () => {
    expect(columnAt(20, 310, layout)).toBe(1);
    expect(columnAt(20, 930, layout)).toBe(3);
  });

  it("is null in the padding, in a gap and past the last column", () => {
    expect(columnAt(10, 0, layout)).toBeNull();
    expect(columnAt(320, 0, layout)).toBeNull();
    expect(columnAt(1900, 0, layout)).toBeNull();
    expect(columnAt(1600, 1300, layout)).toBeNull();
  });

  it("follows the page width", () => {
    const narrow = { ...layout, pageWidth: 100 };
    expect(columnAt(130, 0, narrow)).toBe(1);
    expect(columnAt(300, 0, narrow)).toBe(2);
  });
});

describe("edgeScrollSpeed", () => {
  it("is zero away from the edges", () => {
    expect(edgeScrollSpeed(200, 400, 60, 20)).toBe(0);
    expect(edgeScrollSpeed(60, 400, 60, 20)).toBeCloseTo(0);
    expect(edgeScrollSpeed(340, 400, 60, 20)).toBeCloseTo(0);
  });

  it("scrolls toward the start near the start and the end near the end", () => {
    expect(edgeScrollSpeed(30, 400, 60, 20)).toBeLessThan(0);
    expect(edgeScrollSpeed(370, 400, 60, 20)).toBeGreaterThan(0);
  });

  it("speeds up closer to the edge and caps at the maximum", () => {
    const speeds = [50, 40, 30, 20, 10, 0].map((p) => Math.abs(edgeScrollSpeed(p, 400, 60, 20)));
    expect(speeds).toEqual([...speeds].sort((a, b) => a - b));
    expect(speeds[5]).toBe(20);
    expect(edgeScrollSpeed(-30, 400, 60, 20)).toBe(-20);
    expect(edgeScrollSpeed(460, 400, 60, 20)).toBe(20);
  });

  it("does nothing without a zone", () => {
    expect(edgeScrollSpeed(0, 400, 0, 20)).toBe(0);
  });
});

describe("pager offsets", () => {
  it("stops at the end of the content", () => {
    expect(maxPagerOffset(390, layout)).toBe(32 + 1800 + 50 - 390);
    expect(maxPagerOffset(5000, layout)).toBe(0);
  });

  it("snaps to the nearest page and stays within the pages", () => {
    expect(snapOffset(140, layout)).toBe(0);
    expect(snapOffset(180, layout)).toBe(310);
    expect(snapOffset(-50, layout)).toBe(0);
    expect(snapOffset(99999, layout)).toBe(5 * 310);
  });
});
