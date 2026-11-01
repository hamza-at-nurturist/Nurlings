import {
  AVATAR_DIZZY_MS,
  avatarFollowPull,
  avatarFollowRadius,
  createShakeDetector,
} from "@rakazo/core";

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
  /** Called when a shake near this avatar starts or ends its dizziness. */
  onDizzy: (on: boolean) => void;
}

const targets = new Set<AvatarPointerTarget>();
const dizzy = new Set<AvatarPointerTarget>();
const detector = createShakeDetector();
let pointer: { x: number; y: number } | null = null;
let queued = false;
let dizzyTimer: ReturnType<typeof setTimeout> | undefined;

function aim() {
  queued = false;
  for (const target of targets) {
    const el = target.element as HTMLElement;
    let gx = 0;
    let gy = 0;
    const strength = target.strength();
    if (pointer && strength > 0 && !dizzy.has(target)) {
      const rect = el.getBoundingClientRect();
      const dx = pointer.x - (rect.left + rect.width / 2);
      const dy = pointer.y - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = avatarFollowPull(dist, rect.width) * strength * target.reach;
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

function clearDizzy() {
  detector.reset();
  for (const target of dizzy) target.onDizzy(false);
  dizzy.clear();
  queue();
}

/** A shake makes the avatars near the pointer dizzy, not every avatar on the page. */
function startDizzy(at: { x: number; y: number }) {
  for (const target of targets) {
    const rect = target.element.getBoundingClientRect();
    const distance = Math.hypot(
      at.x - (rect.left + rect.width / 2),
      at.y - (rect.top + rect.height / 2),
    );
    if (distance > avatarFollowRadius(rect.width) || dizzy.has(target)) continue;
    dizzy.add(target);
    target.onDizzy(true);
  }
  clearTimeout(dizzyTimer);
  dizzyTimer = setTimeout(clearDizzy, AVATAR_DIZZY_MS);
  queue();
}

function onMove(event: PointerEvent) {
  pointer = { x: event.clientX, y: event.clientY };
  if (dizzy.size === 0 && detector.push(event.clientX, event.clientY, performance.now())) {
    startDizzy(pointer);
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
  clearDizzy();
  pointer = null;
  queued = false;
}

/** Register an avatar for following; returns the unregister function. */
export function registerAvatarPointer(target: AvatarPointerTarget): () => void {
  if (targets.size === 0) attach();
  targets.add(target);
  queue();
  return () => {
    targets.delete(target);
    dizzy.delete(target);
    if (targets.size === 0) detach();
  };
}
