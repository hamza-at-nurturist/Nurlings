import type { AvatarState, AvatarSwap, AvatarTool, AvatarWorking } from "@rakazo/core";
import {
  AVATAR_DONE_MS,
  AVATAR_LONG_RUN_MS,
  AVATAR_SWAP_IN_MS,
  AVATAR_SWAP_OUT_MS,
  avatarBusySince,
  avatarState,
  avatarSwapAdvance,
  avatarSwapStart,
  avatarSwapTo,
  avatarWorking,
  isRunWorking,
} from "@rakazo/core";
import { useEffect, useReducer, useRef, useState } from "react";

export interface AvatarStateSource {
  status?: string;
  composing?: boolean;
  tool?: AvatarTool;
  ticketStatus?: string;
  asleep?: boolean;
  progress?: number | null;
}

/**
 * The avatar's state, working look and tool, from the run status and live detail. Two timers live
 * here: the done pose after a run completes, and the long-run mark after three minutes of work.
 * A run that is already completed when the avatar mounts is idle, not freshly done.
 */
export function useAvatarState(source: AvatarStateSource): {
  state: AvatarState;
  working: AvatarWorking;
} {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const lastStatus = useRef(source.status);
  const completedAt = useRef<number | null>(null);
  const busySince = useRef<number | null>(null);

  if (lastStatus.current !== source.status) {
    if (source.status === "completed" && isRunWorking(lastStatus.current))
      completedAt.current = Date.now();
    else if (source.status !== "completed") completedAt.current = null;
    lastStatus.current = source.status;
  }
  const now = Date.now();
  const completedAgoMs = completedAt.current === null ? null : now - completedAt.current;
  const state = avatarState({
    runStatus: source.status,
    composing: source.composing,
    ticketStatus: source.ticketStatus,
    asleep: source.asleep,
    completedAgoMs,
  });
  busySince.current = avatarBusySince(busySince.current, state, now);
  const busyMs = busySince.current === null ? 0 : now - busySince.current;

  useEffect(() => {
    if (state !== "done" || completedAt.current === null) return;
    const left = Math.max(0, AVATAR_DONE_MS - (Date.now() - completedAt.current));
    const timer = setTimeout(tick, left + 20);
    return () => clearTimeout(timer);
  }, [state]);
  useEffect(() => {
    if (busySince.current === null) return;
    const left = AVATAR_LONG_RUN_MS - (Date.now() - busySince.current);
    if (left <= 0) return;
    const timer = setTimeout(tick, left + 20);
    return () => clearTimeout(timer);
  }, [state]);

  const working = avatarWorking({
    status: source.status,
    tool: source.tool,
    progress: source.progress,
    busyMs,
  });
  return { state, working };
}

/**
 * The prop on screen while the tool changes: the old one drops (240 ms), then the new one pops in
 * (500 ms). `animate` false (a still avatar) switches at once.
 */
export function useToolSwap(tool: AvatarTool, animate: boolean): AvatarSwap {
  const [swap, setSwap] = useState(() => avatarSwapStart(tool));
  const current = animate ? swap : avatarSwapStart(tool);

  useEffect(() => {
    if (animate) setSwap((s) => avatarSwapTo(s, tool));
  }, [animate, tool]);
  useEffect(() => {
    if (!animate || swap.phase === "rest") return;
    const timer = setTimeout(
      () => setSwap(avatarSwapAdvance),
      swap.phase === "out" ? AVATAR_SWAP_OUT_MS : AVATAR_SWAP_IN_MS,
    );
    return () => clearTimeout(timer);
  }, [animate, swap]);
  return current;
}
