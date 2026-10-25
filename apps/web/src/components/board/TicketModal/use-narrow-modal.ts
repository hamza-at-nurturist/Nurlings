import { useSyncExternalStore } from "react";

/** Below this the ticket opens as a full-screen sheet with tabs instead of two panes. */
export const NARROW_MODAL_QUERY = "(max-width: 1023px)";

function query(): MediaQueryList | null {
  try {
    return typeof window.matchMedia === "function" ? window.matchMedia(NARROW_MODAL_QUERY) : null;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  const list = query();
  list?.addEventListener("change", onChange);
  return () => list?.removeEventListener("change", onChange);
}

/** Whether the window is narrow enough for the ticket sheet. False where `matchMedia` is missing. */
export function useNarrowModal(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => query()?.matches ?? false,
    () => false,
  );
}
