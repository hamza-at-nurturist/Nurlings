/**
 * How the avatar props move over one loop. Every function takes the loop phase (0–1) and returns
 * plain numbers in avatar units (the 120-unit box), so the animation can run in a Reanimated
 * worklet without touching React. Shapes follow the web renderer's keyframes.
 */

export const PROP_LOOP_MS = 3400;
export const ORBIT_LOOP_MS = 2400;

const TAU = Math.PI * 2;
const fract = (value: number) => {
  "worklet";
  return value - Math.floor(value);
};

/** The pencil draws a wavy line across the pad, holds, then the line and pencil fade. */
export function writeMotion(phase: number): {
  reveal: number;
  penX: number;
  penY: number;
  opacity: number;
} {
  "worklet";
  const reveal = Math.min(1, phase / 0.55);
  const penX = -24 + 48 * reveal;
  const penY = -3 * Math.sin((Math.PI * (penX + 24)) / 8);
  const opacity = phase < 0.86 ? 1 : Math.max(0, 1 - (phase - 0.86) / 0.14);
  return { reveal, penX, penY, opacity };
}

/** The magnifier circles slowly at the body's side. */
export function searchMotion(phase: number): { x: number; y: number; rotate: number } {
  "worklet";
  const angle = phase * TAU;
  return { x: Math.cos(angle) * 5, y: Math.sin(angle) * 3, rotate: Math.sin(angle) * 8 };
}

/** The laptop screen's glow breathes and two bits of code float up from the lid. */
export function computerMotion(phase: number): {
  glow: number;
  bits: { rise: number; opacity: number }[];
} {
  "worklet";
  const bit = (offset: number) => {
    const p = fract(phase * 2 + offset);
    return { rise: p * 10, opacity: Math.sin(Math.PI * p) };
  };
  return { glow: 0.5 + 0.5 * Math.sin(phase * TAU), bits: [bit(0), bit(0.5)] };
}

/** The orbit dot's angle in degrees. */
export function orbitAngle(phase: number): number {
  "worklet";
  return phase * 360;
}

/** Two rings that grow and fade, half a loop apart, while a run is queued. */
export function ripple(phase: number, offset: number): { scale: number; opacity: number } {
  "worklet";
  const p = fract(phase + offset);
  return { scale: 0.85 + 0.5 * p, opacity: 0.45 * (1 - p) };
}

/** The long-run sweat drop slides down and fades. */
export function sweat(phase: number): { y: number; opacity: number } {
  "worklet";
  const p = fract(phase * 2);
  return { y: p * 7, opacity: Math.sin(Math.PI * p) };
}

/** Three thinking dots take turns brightening. */
export function thinkingDot(phase: number, slot: 0 | 1 | 2): number {
  "worklet";
  return 0.25 + 0.75 * Math.max(0, Math.sin(fract(phase * 2 - slot / 3) * Math.PI));
}
