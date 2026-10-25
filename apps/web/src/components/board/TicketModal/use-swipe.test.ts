import { describe, expect, it } from "vitest";
import { swipeDirection } from "./use-swipe";

describe("swipeDirection", () => {
  it("reads a long horizontal swipe", () => {
    expect(swipeDirection(-80, 10)).toBe("left");
    expect(swipeDirection(90, -20)).toBe("right");
  });

  it("ignores short or mostly vertical moves", () => {
    expect(swipeDirection(-40, 0)).toBeNull();
    expect(swipeDirection(100, 60)).toBeNull();
  });
});
