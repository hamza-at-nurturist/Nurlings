/** Direction changes that make a shake, inside the window below. */
export const AVATAR_SHAKE_TURNS = 10;
export const AVATAR_SHAKE_WINDOW_MS = 1500;
/** Smallest pointer step (px) on an axis that counts as movement. */
export const AVATAR_SHAKE_STEP = 16;
/** How long avatars stay dizzy after a shake. */
export const AVATAR_DIZZY_MS = 2400;

/**
 * Detects a shaken pointer: many quick direction changes in a short window. Feed it every
 * pointer position with a timestamp; it answers whether a shake is under way. Pure state, no timers.
 */
export function createShakeDetector() {
  let turns: number[] = [];
  const axes = {
    x: { last: null as number | null, dir: 0 },
    y: { last: null as number | null, dir: 0 },
  };
  const feed = (axis: "x" | "y", value: number, now: number) => {
    const a = axes[axis];
    if (a.last === null) {
      a.last = value;
      return;
    }
    const delta = value - a.last;
    if (Math.abs(delta) < AVATAR_SHAKE_STEP) return;
    const dir = delta > 0 ? 1 : -1;
    if (a.dir && dir !== a.dir) turns.push(now);
    a.dir = dir;
    a.last = value;
  };
  return {
    push(x: number, y: number, now: number): boolean {
      feed("x", x, now);
      feed("y", y, now);
      turns = turns.filter((time) => now - time < AVATAR_SHAKE_WINDOW_MS);
      return turns.length >= AVATAR_SHAKE_TURNS;
    },
    reset() {
      turns = [];
      axes.x = { last: null, dir: 0 };
      axes.y = { last: null, dir: 0 };
    },
  };
}
