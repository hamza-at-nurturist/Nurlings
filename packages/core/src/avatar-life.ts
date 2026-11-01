import type { AvatarClipName, AvatarKey, AvatarPose } from "./avatar-clips.js";
import {
  AVATAR_BRIDGE,
  AVATAR_CLIP_POOLS,
  AVATAR_REST_POSE,
  avatarClip,
  avatarClipPose,
  avatarEase,
  avatarTrackValue,
} from "./avatar-clips.js";
import type { AvatarTool } from "./avatar-tool.js";
import { isRunWaitingOnUser, isRunWorking } from "./run-state.js";

/**
 * Life for bot avatars, played flat on our shapes. A resting avatar is a still picture;
 * a busy bot's avatar plays authored working clips; while the bot writes its reply the
 * avatar turns into the typing dots. Only a few surfaces move at all.
 */

export type AvatarLifeState = "idle" | "working" | "thinking";

/**
 * A queued or running bot is working, and thinking while it writes reply text
 * (`composing`). A bot waiting on the user rests, like one that has finished.
 */
export function avatarLifeState(
  status: string | null | undefined,
  composing = false,
): AvatarLifeState {
  if (!isRunWorking(status)) return "idle";
  return composing ? "thinking" : "working";
}

/**
 * How an avatar is allowed to move:
 * - static: always a picture (the default: headers, profiles, pickers, group faces);
 * - lazy: a picture at rest, moving while its bot is busy (inbox rows, pinned chats);
 * - live: blinks at rest too (the call card);
 * - running: always moving (the activity mark in a chat).
 */
export type AvatarMotionMode = "static" | "lazy" | "live" | "running";

/**
 * How an avatar moves right now:
 * - still: a picture;
 * - parked: no motion, but it blinks (a live avatar at rest, or anything under Reduce Motion);
 * - running: it plays its clips.
 */
export type AvatarClock = "still" | "parked" | "running";

/** After a bot goes back to rest, its avatar keeps moving this long, then goes still. */
export const AVATAR_SETTLE_MS = 1400;
/** Avatars this small (in points) stay still: their motion would only read as jitter. */
export const AVATAR_STILL_MAX_SIZE = 24;
/** Below this size an avatar keeps to the gentlest idle clips. */
export const AVATAR_COMPACT_SIZE = 44;

export function avatarClock(input: {
  mode: AvatarMotionMode;
  onScreen: boolean;
  hasEyes: boolean;
  size: number;
  state: AvatarLifeState;
  settling: boolean;
  reducedMotion: boolean;
}): AvatarClock {
  const { mode } = input;
  if (mode === "static" || !input.onScreen || !input.hasEyes) return "still";
  if (input.size <= AVATAR_STILL_MAX_SIZE) return "still";
  const resting = input.state === "idle" && !input.settling && mode !== "running";
  if (resting) return mode === "live" ? "parked" : "still";
  return input.reducedMotion ? "parked" : "running";
}

/**
 * The clips a state plays. At rest only a live avatar (the call card) blinks; any other
 * avatar that still moves at rest (settling, or the chat's running avatars) holds still.
 */
export function avatarClipPool(
  state: AvatarLifeState,
  size: number,
  mode: AvatarMotionMode,
): readonly AvatarClipName[] {
  if (state === "working") return AVATAR_CLIP_POOLS.working;
  if (state === "thinking") return AVATAR_CLIP_POOLS.thinking;
  if (mode !== "live") return AVATAR_CLIP_POOLS.settling;
  return size < AVATAR_COMPACT_SIZE ? AVATAR_CLIP_POOLS.compactIdle : AVATAR_CLIP_POOLS.idle;
}

/** One stretch of an avatar's timeline: a clip, or a bridge between two poses. */
export interface AvatarSegment {
  start: number;
  duration: number;
  clip?: AvatarClipName;
  from?: AvatarPose;
  to?: AvatarPose;
}

/** Rotation, position, zoom and lid gaps above which the next clip is bridged. */
const BRIDGE_IF = { angle: 1, position: 0.01, zoom: 0.005, lid: 0.05 };

/** Each angle of `pose` moved by whole turns to the one nearest `toward`. */
function unwrap(pose: AvatarPose, toward: AvatarPose): AvatarPose {
  const near = (angle: number, target: number) => angle - 360 * Math.round((angle - target) / 360);
  return {
    ...pose,
    pitch: near(pose.pitch, toward.pitch),
    yaw: near(pose.yaw, toward.yaw),
    roll: near(pose.roll, toward.roll),
  };
}

function differs(a: AvatarPose, b: AvatarPose): boolean {
  return (
    Math.max(Math.abs(a.pitch - b.pitch), Math.abs(a.yaw - b.yaw), Math.abs(a.roll - b.roll)) >
      BRIDGE_IF.angle ||
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) > BRIDGE_IF.position ||
    Math.abs(a.zoom - b.zoom) > BRIDGE_IF.zoom ||
    Math.abs(a.lid - b.lid) > BRIDGE_IF.lid
  );
}

/**
 * A timeline from `start` (seconds): clips drawn from `pool` in shuffled rounds (a clip
 * listed twice comes up twice as often), never the same clip twice in a row, each bridged
 * from the pose before it, even one cut off mid-turn. `random` returns 0–1.
 */
export function avatarSchedule(
  pool: readonly AvatarClipName[],
  start: number,
  startPose: AvatarPose,
  random: () => number,
  rounds = 6,
): AvatarSegment[] {
  const segments: AvatarSegment[] = [];
  let time = start;
  let pose = startPose;
  let last: AvatarClipName | undefined;
  const repeats = new Set(pool).size < 2;
  for (let round = 0; round < rounds; round += 1) {
    const left = [...pool];
    while (left.length > 0) {
      const choices = left.flatMap((clip, index) => (repeats || clip !== last ? [index] : []));
      // Only repeats of the last clip are left: the round ends early.
      if (choices.length === 0) break;
      const clip = left.splice(choices[Math.floor(random() * choices.length)]!, 1)[0]!;
      const opening = avatarClipPose(avatarClip(clip), 0);
      const from = unwrap(pose, opening);
      if (AVATAR_BRIDGE.seconds > 0 && differs(from, opening)) {
        segments.push({ start: time, duration: AVATAR_BRIDGE.seconds, from, to: opening });
        time += AVATAR_BRIDGE.seconds;
      }
      const clipData = avatarClip(clip);
      segments.push({ start: time, duration: clipData.duration, clip });
      time += clipData.duration;
      pose = avatarClipPose(clipData, clipData.duration);
      last = clip;
    }
  }
  return segments;
}

/** The timeline's pose at `seconds`; holds the last pose past the end. */
export function avatarSchedulePose(
  segments: readonly AvatarSegment[],
  seconds: number,
): AvatarPose {
  "worklet";
  let segment = segments[0];
  for (const candidate of segments) {
    if (candidate.start > seconds) break;
    segment = candidate;
  }
  if (!segment) return AVATAR_REST_POSE;
  const local = Math.min(Math.max(seconds - segment.start, 0), segment.duration);
  if (segment.clip) return avatarClipPose(avatarClip(segment.clip), local);
  const from = segment.from ?? AVATAR_REST_POSE;
  const to = segment.to ?? AVATAR_REST_POSE;
  const eased = avatarEase(AVATAR_BRIDGE.ease, local / segment.duration);
  const mix = (a: number, b: number) => a + (b - a) * eased;
  return {
    pitch: mix(from.pitch, to.pitch),
    yaw: mix(from.yaw, to.yaw),
    roll: mix(from.roll, to.roll),
    x: mix(from.x, to.x),
    y: mix(from.y, to.y),
    zoom: mix(from.zoom, to.zoom),
    lid: mix(from.lid, to.lid),
  };
}

/** Avatar motion is measured in hundredths of the avatar's width. */
export const AVATAR_MOTION_UNITS = 100;

/** How far turning the head a quarter turn would move the eyes, in motion units. */
export const AVATAR_EYE_REACH = { x: 34, y: 36 };
/** How much a head turned a quarter turn would narrow. */
const TURN_NARROWING = 0.16;
/** How far a shut lid closes the eyes: a shut eye keeps a thin line. */
export const AVATAR_LID_CLOSE = 0.9;

/** A flat frame: body rotation (degrees), translation and scale (fractions of size), eyes. */
export interface AvatarFrame {
  rotate: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  eyeX: number;
  eyeY: number;
  /** Eye height, 1 open. */
  lid: number;
}

/**
 * The flat version of a head pose: roll turns the body, yaw and pitch move the eyes across
 * the face and narrow it a little, position (in radius units) moves the body, zoom scales
 * it. `awake` (0–1) eases the motion, lids included, in and out of the still picture.
 */
export function avatarFrame(pose: AvatarPose, awake: number): AvatarFrame {
  "worklet";
  const rad = Math.PI / 180;
  const yaw = Math.sin(pose.yaw * rad);
  const pitch = Math.sin(pose.pitch * rad);
  const scale = pose.zoom / AVATAR_REST_POSE.zoom;
  const toward = (value: number, rest: number) => rest + (value - rest) * awake;
  return {
    rotate: pose.roll * awake,
    translateX: pose.x * pose.zoom * 0.5 * awake,
    translateY: pose.y * pose.zoom * 0.5 * awake,
    scaleX: toward(scale * (1 - TURN_NARROWING * Math.abs(yaw)), 1),
    scaleY: toward(scale * (1 - TURN_NARROWING * Math.abs(pitch)), 1),
    eyeX: yaw * AVATAR_EYE_REACH.x * awake,
    eyeY: pitch * AVATAR_EYE_REACH.y * awake,
    lid: 1 - AVATAR_LID_CLOSE * pose.lid * awake,
  };
}

function smoothStep(from: number, to: number, x: number): number {
  "worklet";
  const t = Math.min(Math.max((x - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
}

/** A soft 0–1–0 bump over the first `width` of a cycle's `phase` (0–1), then rest. */
function bump(phase: number, width: number): number {
  "worklet";
  return phase < width ? (1 - Math.cos((2 * Math.PI * phase) / width)) / 2 : 0;
}

/** Where `seconds` falls in a `period`, delayed by `lag` of it, as 0–1. */
function cycle(seconds: number, period: number, lag: number): number {
  "worklet";
  const phase = seconds / period - lag;
  return phase - Math.floor(phase);
}

/** A resting blink, slower than a busy face's: seconds to shut, then to open again. */
const RESTING_BLINK = { close: 0.1, open: 0.22 };

/** A resting blink: how shut the eyes are (0–1) `seconds` into it. */
export function avatarRestingBlink(seconds: number): number {
  "worklet";
  const { close, open } = RESTING_BLINK;
  if (seconds <= 0 || seconds >= close + open) return 0;
  return seconds < close
    ? (1 - Math.cos((Math.PI * seconds) / close)) / 2
    : (1 + Math.cos((Math.PI * (seconds - close)) / open)) / 2;
}

/** The dots a thinking avatar becomes: positions and sizes in motion units, from the centre. */
export interface AvatarDot {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

/**
 * The typing dots, in motion units: how far the side dots sit from the middle (about a dot
 * apart), their radius, how much bigger and how much higher the leading dot is, and the
 * wave that passes the lead from left to right: its period (seconds), each dot's lag (of a
 * period), how much of a period a dot spends leading, and how faint the other dots are.
 */
export const AVATAR_TYPING_DOTS = {
  spread: 34,
  radius: 8,
  lead: 3,
  lift: 4,
  period: 1.2,
  lag: 1 / 3,
  rise: 0.45,
  faint: 0.7,
};

/**
 * Dot `slot` (0 left, 1 the body, 2 right) of the typing dots at `seconds`, `morph` (0–1)
 * of the way from the face: the middle dot takes over from the shrinking face, the side
 * dots slide out of it, and then the lead passes from dot to dot, left to right: the
 * leading dot grows, lifts a little and takes full colour while the others stay faint.
 */
export function avatarThinkingDot(slot: 0 | 1 | 2, seconds: number, morph: number): AvatarDot {
  "worklet";
  const { spread, radius, lead, lift, period, lag, rise, faint } = AVATAR_TYPING_DOTS;
  const out = smoothStep(0.25, 1, morph);
  const shown = slot === 1 ? smoothStep(0.5, 1, morph) : smoothStep(0.35, 0.9, morph);
  const leading = bump(cycle(seconds, period, slot * lag), rise) * out;
  return {
    x: (slot - 1) * spread * out,
    y: -lift * leading,
    radius: radius * (slot === 1 ? 1 : 0.6 + 0.4 * out) + lead * leading,
    opacity: shown * (1 - faint + faint * leading),
  };
}

/**
 * The plain typing dots that stand in for a photo face: a slow, calm pulse while the bot
 * works and a quicker ripple while it writes. Period in ms, each dot's lag (of a period),
 * how much of a period a dot spends brightening, and the opacity range.
 */
const PHOTO_PULSE = {
  working: { period: 2200, lag: 0.2, rise: 1, low: 0.35, high: 0.85 },
  typing: { period: 1000, lag: 0.16, rise: 0.6, low: 0.3, high: 1 },
};

/**
 * Opacity of dot `slot` (0–2) of the plain typing dots that stand in for a photo face,
 * `ms` after they appear; `typing` while the bot writes reply text.
 */
export function avatarPhotoDot(slot: 0 | 1 | 2, ms: number, typing: boolean): number {
  "worklet";
  const { period, lag, rise, low, high } = typing ? PHOTO_PULSE.typing : PHOTO_PULSE.working;
  return low + (high - low) * bump(cycle(ms, period, slot * lag), rise);
}

/**
 * The working dot on a busy bot's avatar of `size` pt: a `diameter` pt disc set `inset` pt
 * in from the avatar's bottom corner, inside a `ring` pt ring of the surface behind it.
 */
export function avatarWorkingDot(size: number): { diameter: number; inset: number; ring: number } {
  const ring = size * 0.046;
  if (size <= 40) return { diameter: 10, inset: 0.5, ring };
  if (size < 80) return { diameter: 12, inset: 0, ring };
  return { diameter: size < 96 ? 15 : 17, inset: 3, ring };
}

/** A tap on the activity mark plays the next of these, in turn. */
export type AvatarPoke = "spin" | "bounce" | "nod";
export const AVATAR_POKES: readonly AvatarPoke[] = ["spin", "bounce", "nod"];
/** How long each tap reaction lasts, in seconds. */
export const AVATAR_POKE_SECONDS: Record<AvatarPoke, number> = {
  spin: 0.8,
  bounce: 0.7,
  nod: 0.7,
};

/**
 * Each tap reaction as keys over its length (0–1), with values [rotate (degrees),
 * translateY (of the size, up is negative), scaleY, eyeY (motion units)].
 */
const POKE_KEYS: Record<AvatarPoke, readonly AvatarKey[]> = {
  /** A full turn with a little hop, springing a touch past home and back. */
  spin: [
    [0, [-360, 0, 1, 0], [0.35, 0, 0.6, 0.55]],
    [0.45, [-170, -0.07, 1.04, -6], [0.3, 0.45, 0.25, 1.1]],
    [1, [0, 0, 1, 0], [0, 0, 1, 1]],
  ],
  /** A deep crouch, a high hop, a squashed landing and a small rebound. */
  bounce: [
    [0, [0, 0, 1, 0], [0.45, 0, 0.55, 1]],
    [0.12, [0, 0.02, 0.86, 4], [0.2, 0.6, 0.4, 1]],
    [0.4, [0, -0.15, 1.03, -6], [0.6, 0, 0.8, 0.4]],
    [0.64, [0, 0.02, 0.84, 3], [0.2, 0.6, 0.4, 1]],
    [0.8, [0, -0.04, 1.03, -1], [0.45, 0, 0.55, 1]],
    [1, [0, 0, 1, 0], [0, 0, 1, 1]],
  ],
  /** A deep nod, a smaller second one, and home. */
  nod: [
    [0, [0, 0, 1, 0], [0.3, 0, 0.3, 1]],
    [0.26, [0, 0.05, 0.92, 16], [0.45, 0, 0.55, 1]],
    [0.48, [0, -0.01, 1.02, -3], [0.45, 0, 0.55, 1]],
    [0.7, [0, 0.025, 0.96, 8], [0.45, 0, 0.55, 1]],
    [1, [0, 0, 1, 0], [0, 0, 1, 1]],
  ],
};

/** What a poke adds to the frame `p` (0–1) of the way through; nothing outside it. */
export function avatarPokeFrame(
  poke: AvatarPoke,
  p: number,
): { rotate: number; translateY: number; scaleY: number; eyeY: number } {
  "worklet";
  const value = p > 0 && p < 1 ? avatarTrackValue(POKE_KEYS[poke], p) : null;
  if (!value) return { rotate: 0, translateY: 0, scaleY: 1, eyeY: 0 };
  return { rotate: value[0]!, translateY: value[1]!, scaleY: value[2]!, eyeY: value[3]! };
}

/* ---------------------------------------------------------------------------------------------
 * Avatar states: what an organic avatar shows. Pure data and functions, shared by web and mobile.
 * ------------------------------------------------------------------------------------------- */

export const AVATAR_STATES = [
  "idle",
  "thinking",
  "working",
  "needs",
  "review",
  "blocked",
  "done",
  "asleep",
] as const;
export type AvatarState = (typeof AVATAR_STATES)[number];

/** A finished run shows done this long, then rests. */
export const AVATAR_DONE_MS = 4000;
/** Continuous work (working or thinking) this long reads as a long run: slower breath, tired eyes. */
export const AVATAR_LONG_RUN_MS = 180_000;

export interface AvatarStateInput {
  /** The bot's latest run status. */
  runStatus?: string | null;
  /** The bot is writing its reply text. */
  composing?: boolean;
  /** Milliseconds since the latest run completed; omit when it has not just completed. */
  completedAgoMs?: number | null;
  /** The status of the ticket this avatar stands for, on views that show one. */
  ticketStatus?: string | null;
  /** The bot's computer is asleep. Nothing supplies this yet. */
  asleep?: boolean;
  /** The run is background work (tickets) that must not drive a chat avatar. */
  background?: boolean;
}

/**
 * The one mapping from what the product already knows to an avatar state. First match wins:
 * asleep, needs you, blocked, in review, working or thinking, done, idle. No new statuses.
 */
export function avatarState(input: AvatarStateInput): AvatarState {
  const run = input.background ? undefined : input.runStatus;
  if (input.asleep) return "asleep";
  if (isRunWaitingOnUser(run)) return "needs";
  if (run === "failed" || input.ticketStatus === "blocked") return "blocked";
  if (input.ticketStatus === "review") return "review";
  if (isRunWorking(run)) return input.composing ? "thinking" : "working";
  const justDone =
    run === "completed" &&
    input.completedAgoMs !== null &&
    input.completedAgoMs !== undefined &&
    input.completedAgoMs < AVATAR_DONE_MS;
  if (justDone || input.ticketStatus === "done" || input.ticketStatus === "closed") return "done";
  return "idle";
}

/** The older three-state view of an avatar state, for the pose and clip system. */
export function avatarMotionState(state: AvatarState): AvatarLifeState {
  if (state === "working") return "working";
  if (state === "thinking") return "thinking";
  return "idle";
}

/**
 * When the current stretch of continuous work began: kept while the avatar is working or thinking,
 * cleared when it is not. Pass the result back in on the next change.
 */
export function avatarBusySince(
  since: number | null,
  state: AvatarState,
  now: number,
): number | null {
  return state === "working" || state === "thinking" ? (since ?? now) : null;
}

export type AvatarWorkingLook = "tool" | "ring" | "orbit" | "ripple";

export interface AvatarWorking {
  look: AvatarWorkingLook;
  /** The prop to show; `none` unless the look is `tool`. */
  tool: AvatarTool;
  long: boolean;
}

/**
 * How a working avatar looks. A queued or leased run has started nothing and has no progress, so it
 * ripples. Otherwise a known tool shows its prop, a known progress (0 to 1) shows the ring, and the
 * orbit dot is the default.
 */
export function avatarWorking(input: {
  status?: string | null;
  tool?: AvatarTool;
  progress?: number | null;
  busyMs?: number;
}): AvatarWorking {
  const tool = input.tool ?? "none";
  const long = (input.busyMs ?? 0) >= AVATAR_LONG_RUN_MS;
  if (input.status === "queued" || input.status === "leased")
    return { look: "ripple", tool: "none", long };
  if (tool !== "none") return { look: "tool", tool, long };
  const progress = input.progress;
  if (typeof progress === "number" && Number.isFinite(progress))
    return { look: "ring", tool: "none", long };
  return { look: "orbit", tool: "none", long };
}

/** How far the eyes follow the pointer, 0 to 1, per state; props that hold the gaze follow less. */
export function avatarFollowStrength(state: AvatarState, tool: AvatarTool = "none"): number {
  if (state === "working") return tool === "computer" ? 0.3 : tool === "none" ? 1 : 0;
  if (state === "thinking" || state === "asleep") return 0;
  if (state === "needs") return 0.5;
  if (state === "blocked") return 0.4;
  return 1;
}

/** Pointer follow reach in avatar units: the eyes lead, the body goes a third of the way. */
export const AVATAR_FOLLOW_REACH = { eyes: 9, body: 3.2 } as const;
/** Pointer distance (px) at which follow reaches full strength. */
export const AVATAR_FOLLOW_RANGE = 180;

/** Prop swap timings, from the storyboard: the old prop drops, the new one pops in. */
export const AVATAR_SWAP_OUT_MS = 240;
export const AVATAR_SWAP_IN_MS = 500;

export type AvatarSwapPhase = "rest" | "out" | "in";
export interface AvatarSwap {
  /** The prop on screen (during `out`, the one dropping). */
  shown: AvatarTool;
  /** The prop it is moving to; equals `shown` at rest. */
  target: AvatarTool;
  phase: AvatarSwapPhase;
}

export function avatarSwapStart(tool: AvatarTool): AvatarSwap {
  return { shown: tool, target: tool, phase: "rest" };
}

/** A new tool: at rest the old prop starts to drop; mid-swap the pending target is replaced. */
export function avatarSwapTo(swap: AvatarSwap, tool: AvatarTool): AvatarSwap {
  if (swap.phase === "rest") {
    return tool === swap.shown ? swap : { shown: swap.shown, target: tool, phase: "out" };
  }
  if (swap.phase === "out") return { ...swap, target: tool };
  // The new prop has just popped in: it drops again.
  return tool === swap.shown ? swap : { shown: swap.shown, target: tool, phase: "out" };
}

/** The next phase once the current one's time is up: out, then in, then rest. */
export function avatarSwapAdvance(swap: AvatarSwap): AvatarSwap {
  if (swap.phase === "out") return { shown: swap.target, target: swap.target, phase: "in" };
  if (swap.phase === "in") return { ...swap, phase: "rest" };
  return swap;
}
