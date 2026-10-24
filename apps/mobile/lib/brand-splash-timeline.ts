// The splash's timeline. Times are percentages of one 6 s run; the exit has its own clock that
// starts when the app is ready. Everything here is plain data and worklets, so the component only
// samples it.

/** Rows are `[percent, ...values]`, sorted by percent. */
export type Track = readonly (readonly number[])[];

export const EASE_LINEAR = 0;
export const EASE_IN_OUT = 1;
export const EASE_IN = 2;
export const EASE_OUT = 3;
export type Ease = 0 | 1 | 2 | 3;

export const FULL_MS = 6000;
export const MS_PER_PERCENT = FULL_MS / 100;
/** The short run stops once Chief has landed and the orb has settled. */
export const SHORT_END = 29;
/** A full run holds here until the app is ready, then idles. */
export const GATE_PERCENT = 82;
export const EXIT_START_PERCENT = 84;
/** The exit clock runs 0..EXIT_SPAN (percent of FULL_MS), from 84% to 99% of the full run. */
export const EXIT_SPAN = 15;
export const EXIT_MS = EXIT_SPAN * MS_PER_PERCENT;
export const FADE_MS = 250;
export const IDLE_BLINK_MS = 3200;
export const STATIC_MS = 600;

/** `[percent, translateY, scaleX, scaleY, rotate°]` in SVG user units. */
export const CHIEF_BODY: Track = [
  [0, 60, 0.04, 0.04, 0],
  [1.5, 40, 0.22, 0.16, 0],
  [4.5, 0, 1.2, 0.78, -3],
  [6.8, -34, 0.84, 1.17, 2.5],
  [8.8, 0, 1.09, 0.92, -1.5],
  [10.6, -8, 0.96, 1.05, 1],
  [12.2, 0, 1.02, 0.98, -0.4],
  [14, 0, 1, 1, 0],
  [62, 0, 1, 1, 0],
  [65, 0, 1.08, 0.88, 0],
  [69, -230, 0.94, 1.08, 0],
  [73, 0, 1.1, 0.88, 0],
  [76, 0, 0.97, 1.03, 0],
  [79, 0, 1, 1, 0],
];
export const CHIEF_OPACITY: Track = [
  [0, 0],
  [1.5, 1],
];
export const ORB_BODY: Track = [
  [0, 620, 0.6, 0.6, 0],
  [8, 620, 0.6, 0.6, 0],
  [18, -60, 0.94, 1.08, 0],
  [22, 0, 1.14, 0.86, 0],
  [26, 0, 0.96, 1.04, 0],
  [29, 0, 1, 1, 0],
  [65, 0, 1, 1, 0],
  [68, 0, 1.1, 0.86, 0],
  [72, -300, 0.92, 1.1, 0],
  [76, 0, 1.14, 0.86, 0],
  [79, 0, 0.96, 1.04, 0],
  [82, 0, 1, 1, 0],
];
export const ORB_OPACITY: Track = [
  [0, 0],
  [8, 0],
  [10, 1],
];

/** `[percent, x, y]`: where the eyes look, in user units. */
export const CHIEF_LOOK: Track = [
  [0, 0, 0],
  [21, 0, 0],
  [25, 56, -14],
  [45, 56, -14],
  [50, 0, 0],
];
export const ORB_LOOK: Track = [
  [0, 0, 0],
  [28, 0, 0],
  [31, -26, 8],
  [45, -26, 8],
  [50, 0, 0],
];
/** `[percent, scaleY]`. */
export const CHIEF_BLINK: Track = [
  [0, 0.1],
  [10, 0.1],
  [12.5, 1.14],
  [14, 1],
  [16.5, 1],
  [17.3, 0.1],
  [18.2, 1],
];
export const CHIEF_WINK: Track = [
  [0, 1],
  [52, 1],
  [54, 0.1],
  [57, 0.1],
  [60, 1],
];
export const ORB_BLINK: Track = [
  [0, 1],
  [37, 1],
  [39, 0.1],
  [41, 1],
];
/** While waiting for the app: a blink once per loop of `IDLE_BLINK_MS`, in percent of the loop. */
export const IDLE_BLINK: Track = [
  [0, 1],
  [88, 1],
  [92, 0.1],
  [96, 1],
];
/** The orb blinks a beat after Chief, as a share of the loop. */
export const IDLE_ORB_OFFSET = 6;

/** Exit tracks run on the exit clock (0..EXIT_SPAN). `[percent, scale]`. */
export const ORB_EXIT: Track = [
  [0, 1],
  [2, 1.18],
  [6, 0],
];
export const CHIEF_EXIT: Track = [
  [0, 1],
  [4, 1],
  [6, 1.14],
  [10, 0],
];
/** `[percent, scale, opacity]`. */
export const GRADIENT_RING: Track = [
  [4, 0.6, 0],
  [5, 0.8, 1],
  [11, 2.1, 0],
];
export const WHITE_RING: Track = [
  [8, 0.4, 0],
  [9, 0.5, 1],
  [15, 1.4, 0],
];

export function easeValue(t: number, ease: Ease): number {
  "worklet";
  if (ease === EASE_IN_OUT) return t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);
  if (ease === EASE_IN) return t * t * t;
  if (ease === EASE_OUT) return 1 - (1 - t) ** 3;
  return t;
}

/** The track's values at `percent`, eased between rows and held outside the first and last. */
export function sampleTrack(track: Track, percent: number, ease: Ease = EASE_IN_OUT): number[] {
  "worklet";
  const first = track[0] ?? [0];
  const last = track[track.length - 1] ?? first;
  if (percent <= (first[0] ?? 0)) return first.slice(1);
  if (percent >= (last[0] ?? 0)) return last.slice(1);
  let i = 0;
  while ((track[i + 1]?.[0] ?? Number.POSITIVE_INFINITY) < percent) i++;
  const from = track[i] ?? first;
  const to = track[i + 1] ?? last;
  const start = from[0] ?? 0;
  const t = easeValue((percent - start) / ((to[0] ?? 1) - start), ease);
  const out: number[] = [];
  for (let j = 1; j < from.length; j++) {
    const a = from[j] ?? 0;
    out.push(a + ((to[j] ?? 0) - a) * t);
  }
  return out;
}

export type SplashMode = "full" | "short" | "static";
export type SplashPhase = "playing" | "idle" | "exit";

/**
 * What the splash should be doing. `recheckInMs` is when the answer can next change without
 * `ready` or `skipped` changing.
 */
export function planSplash(input: {
  mode: SplashMode;
  elapsedMs: number;
  ready: boolean;
  skipped: boolean;
}): { phase: SplashPhase; recheckInMs?: number } {
  const { mode, elapsedMs, ready, skipped } = input;
  if (skipped) return { phase: "exit" };
  if (mode === "static") {
    return ready && elapsedMs >= STATIC_MS
      ? { phase: "exit" }
      : { phase: "playing", recheckInMs: Math.max(0, STATIC_MS - elapsedMs) };
  }
  if (mode === "short") {
    if (ready) return { phase: "exit" };
    const end = SHORT_END * MS_PER_PERCENT;
    return elapsedMs < end ? { phase: "playing", recheckInMs: end - elapsedMs } : { phase: "idle" };
  }
  const exitAt = EXIT_START_PERCENT * MS_PER_PERCENT;
  if (ready) {
    return elapsedMs >= exitAt
      ? { phase: "exit" }
      : { phase: "playing", recheckInMs: exitAt - elapsedMs };
  }
  const gate = GATE_PERCENT * MS_PER_PERCENT;
  return elapsedMs < gate ? { phase: "playing", recheckInMs: gate - elapsedMs } : { phase: "idle" };
}
