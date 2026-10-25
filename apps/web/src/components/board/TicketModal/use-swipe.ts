import type { TouchEvent } from "react";
import { useRef } from "react";

export type SwipeDirection = "left" | "right";

const MIN_TRAVEL = 60;

/** A horizontal swipe: at least 60px across and twice as far across as down. */
export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  if (Math.abs(dx) < MIN_TRAVEL || Math.abs(dx) < 2 * Math.abs(dy)) return null;
  return dx < 0 ? "left" : "right";
}

/**
 * Touch handlers that report a one-finger horizontal swipe. Touch only, so mouse drags and text
 * selection never count, and a swipe that starts in a text field is left to the field.
 */
export function useSwipe(onSwipe: (direction: SwipeDirection) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart(event: TouchEvent) {
      const touch = event.touches[0];
      const inField =
        event.target instanceof Element &&
        event.target.closest("input, textarea, [contenteditable='true']");
      start.current =
        touch && event.touches.length === 1 && !inField
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    },
    onTouchEnd(event: TouchEvent) {
      const from = start.current;
      start.current = null;
      const touch = event.changedTouches[0];
      if (!from || !touch) return;
      const direction = swipeDirection(touch.clientX - from.x, touch.clientY - from.y);
      if (direction) onSwipe(direction);
    },
  };
}
