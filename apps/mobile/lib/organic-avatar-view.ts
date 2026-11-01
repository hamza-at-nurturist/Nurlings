import type { AvatarClock, AvatarState, AvatarTool, AvatarWorking } from "@rakazo/core";
import { AVATAR_STILL_MAX_SIZE } from "@rakazo/core";

export type AvatarPipState = "needs" | "review" | "blocked" | "done";

export interface OrganicAvatarView {
  state: AvatarState;
  /** The corner pip: the only sign of the state on a still avatar. */
  pip: AvatarPipState | undefined;
  /** Props, ripples, ring, orbit and sweat are drawn only while the avatar is moving. */
  animated: boolean;
  /** What the working avatar circles or holds; undefined unless it is working and animated. */
  look: "tool" | "ring" | "orbit" | "ripple" | undefined;
  /** The prop on screen (the one dropping or popping during a swap). */
  tool: AvatarTool;
  long: boolean;
  /** Blocked bodies dull toward gray. */
  dull: boolean;
  /** Eyes are shut. */
  asleep: boolean;
}

const PIPS: Partial<Record<AvatarState, AvatarPipState>> = {
  needs: "needs",
  review: "review",
  blocked: "blocked",
  done: "done",
};

/**
 * What an organic avatar draws for a state. The pip needs no motion, so it shows on every avatar
 * with a status; everything else needs the motion clock to run. 24 pt and smaller avatars and
 * Reduce Motion never run it, so they show only the pip.
 */
export function organicAvatarView(input: {
  state: AvatarState;
  working: AvatarWorking;
  /** The prop the swap reducer says is on screen. */
  shownTool: AvatarTool;
  clock: AvatarClock;
  size: number;
  reducedMotion: boolean;
}): OrganicAvatarView {
  const { state } = input;
  const animated =
    input.clock === "running" && !input.reducedMotion && input.size > AVATAR_STILL_MAX_SIZE;
  const working = state === "working";
  const look = !animated || !working ? undefined : lookFor(input.working, input.shownTool);
  return {
    state,
    pip: PIPS[state],
    animated,
    look,
    tool: look === "tool" ? input.shownTool : "none",
    long: animated && input.working.long && (working || state === "thinking"),
    dull: state === "blocked",
    asleep: state === "asleep",
  };
}

function lookFor(working: AvatarWorking, shown: AvatarTool): "tool" | "ring" | "orbit" | "ripple" {
  if (shown !== "none") return "tool";
  return working.look === "tool" ? "orbit" : working.look;
}

/** The state words that are spoken; idle has none, so an idle avatar is named by its Nurling. */
export type SpokenState = Exclude<AvatarState, "idle">;

/** A blocked body dulls toward gray; colors that are not plain hex are left as they are. */
export function dullBody(color: string, dull: string, amount = 0.45): string {
  const parse = (value: string) => {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())?.[1];
    if (!hex) return undefined;
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
    return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16));
  };
  const from = parse(color);
  const to = parse(dull);
  if (!from || !to) return color;
  const mixed = from.map((channel, i) => Math.round(channel + (to[i]! - channel) * amount));
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/** Where each tool holds the eyes, in motion units: down at the pad, up at the lens, at the screen. */
export const TOOL_GAZE: Record<AvatarTool, { x: number; y: number }> = {
  none: { x: 0, y: 0 },
  write: { x: 0, y: 4 },
  search: { x: 4, y: -3 },
  computer: { x: 0, y: 3 },
};

/** How far the lids may open: asleep eyes are shut, blocked and long-run eyes are heavy. */
export function lidCap(view: Pick<OrganicAvatarView, "asleep" | "dull" | "long">): number {
  if (view.asleep) return 0.08;
  if (view.dull) return 0.75;
  return view.long ? 0.8 : 1;
}
