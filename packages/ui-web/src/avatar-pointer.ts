import { AVATAR_DIZZY_MS, AVATAR_FOLLOW_RANGE, createShakeDetector } from "@rakazo/core";

/**
 * One pointer controller for every avatar on the page. It owns a single pointermove and pointerdown
 * listener (added with the first avatar, removed with the last) and one requestAnimationFrame per
 * frame that writes two CSS variables per avatar. Nothing here touches React state on a pointer move:
 * the stylesheet turns --gx and --gy into the eye and body offsets.
 */
export interface AvatarPointerTarget {
  element: Element;
  /** 0 to 1: how far this avatar follows right now (0 for thinking and asleep). */
  strength: () => number;
  /** Scales the reach for bodies whose eyes sit near the edge. */
  reach: number;
}

const targets = new Set<AvatarPointerTarget>();
const dizzyListeners = new Set<(on: boolean) => void>();
const detector = createShakeDetector();
let pointer: { x: number; y: number } | null = null;
let queued = false;
let dizzyOn = false;
let dizzyTimer: ReturnType<typeof setTimeout> | undefined;

function aim() {
  queued = false;
  for (const target of targets) {
    const el = target.element as HTMLElement;
    let gx = 0;
    let gy = 0;
    const strength = target.strength();
    if (pointer && strength > 0 && !dizzyOn) {
      const rect = el.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, dist / AVATAR_FOLLOW_RANGE) * strength * target.reach;
      gx = (dx / dist) * pull;
      gy = (dy / dist) * pull;
    }
    el.style.setProperty("--gx", gx.toFixed(3));
    el.style.setProperty("--gy", gy.toFixed(3));
  }
}

function queue() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(aim);
}

function setDizzy(on: boolean) {
  dizzyOn = on;
  for (const listener of dizzyListeners) listener(on);
  queue();
}

function onMove(event: PointerEvent) {
  pointer = { x: event.clientX, y: event.clientY };
  if (!dizzyOn && detector.push(event.clientX, event.clientY, performance.now())) {
    setDizzy(true);
    clearTimeout(dizzyTimer);
    dizzyTimer = setTimeout(() => {
      detector.reset();
      setDizzy(false);
    }, AVATAR_DIZZY_MS);
  }
  queue();
}

function onDown(event: PointerEvent) {
  pointer = { x: event.clientX, y: event.clientY };
  queue();
}

function onLeave() {
  pointer = null;
  queue();
}

function attach() {
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onDown, { passive: true });
  window.addEventListener("blur", onLeave);
  document.addEventListener("pointerleave", onLeave);
}

function detach() {
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerdown", onDown);
  window.removeEventListener("blur", onLeave);
  document.removeEventListener("pointerleave", onLeave);
  clearTimeout(dizzyTimer);
  detector.reset();
  pointer = null;
  queued = false;
  if (dizzyOn) setDizzy(false);
}

/** Register an avatar for following; returns the unregister function. */
export function registerAvatarPointer(target: AvatarPointerTarget): () => void {
  if (targets.size === 0) attach();
  targets.add(target);
  queue();
  return () => {
    targets.delete(target);
    if (targets.size === 0) detach();
  };
}

/** Subscribe to the shared dizzy flag; avatars read it with useSyncExternalStore. */
export function subscribeAvatarDizzy(listener: () => void): () => void {
  const notify = () => listener();
  dizzyListeners.add(notify);
  return () => {
    dizzyListeners.delete(notify);
  };
}

export const avatarDizzySnapshot = (): boolean => dizzyOn;
