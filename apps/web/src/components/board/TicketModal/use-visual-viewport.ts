import { useEffect, useState } from "react";

export type ViewportBox = { height: number; top: number };

/**
 * The visible part of the window, which shrinks while the on-screen keyboard is open (`dvh` does
 * not on iOS). Null when off or where the browser has no `visualViewport`.
 */
export function useVisualViewport(enabled: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);
  useEffect(() => {
    const viewport = enabled ? window.visualViewport : null;
    if (!viewport) {
      setBox(null);
      return;
    }
    const update = () => setBox({ height: viewport.height, top: viewport.offsetTop });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, [enabled]);
  return box;
}
