import { describe, expect, it } from "vitest";
import {
  computerMotion,
  orbitAngle,
  ripple,
  searchMotion,
  sweat,
  thinkingDot,
  writeMotion,
} from "./avatar-prop-motion";

describe("avatar prop motion", () => {
  it("writes left to right, holds, then fades", () => {
    expect(writeMotion(0)).toMatchObject({ reveal: 0, penX: -24, opacity: 1 });
    expect(writeMotion(0.55)).toMatchObject({ reveal: 1, penX: 24, opacity: 1 });
    expect(writeMotion(0.7).penX).toBe(24);
    expect(writeMotion(0.93).opacity).toBeCloseTo(0.5, 5);
    expect(writeMotion(1).opacity).toBe(0);
  });
  it("lifts the pen on the first half of each wave segment", () => {
    expect(writeMotion(0.55 * (4 / 48)).penY).toBeCloseTo(-3, 5);
    expect(writeMotion(0.55 * (12 / 48)).penY).toBeCloseTo(3, 5);
  });
  it("circles the magnifier and returns to the start", () => {
    expect(searchMotion(0)).toEqual({ x: 5, y: 0, rotate: 0 });
    expect(searchMotion(1).x).toBeCloseTo(5, 5);
    expect(searchMotion(0.25).y).toBeCloseTo(3, 5);
  });
  it("breathes the laptop glow and floats two bits half a beat apart", () => {
    const motion = computerMotion(0.25);
    expect(motion.glow).toBeCloseTo(1, 5);
    expect(motion.bits).toHaveLength(2);
    expect(motion.bits[0]!.opacity).toBeCloseTo(1, 5);
    expect(motion.bits[1]!.opacity).toBeCloseTo(0, 5);
    expect(computerMotion(0).bits[0]!.opacity).toBe(0);
  });
  it("turns the orbit a full circle per loop", () => {
    expect(orbitAngle(0.5)).toBe(180);
  });
  it("offsets the two ripples and fades them out", () => {
    expect(ripple(0, 0).opacity).toBeCloseTo(0.45, 5);
    expect(ripple(0, 0.5).scale).toBeCloseTo(1.1, 5);
    expect(ripple(0.999, 0).opacity).toBeLessThan(0.01);
  });
  it("shows sweat sliding down", () => {
    expect(sweat(0).opacity).toBe(0);
    expect(sweat(0.25).opacity).toBeCloseTo(1, 5);
    expect(sweat(0.25).y).toBeCloseTo(3.5, 5);
  });
  it("lights the thinking dots one after another", () => {
    expect(thinkingDot(0.5, 2)).toBeGreaterThan(thinkingDot(0.5, 0));
    for (const slot of [0, 1, 2] as const)
      expect(thinkingDot(0.3, slot)).toBeGreaterThanOrEqual(0.25);
  });
});
