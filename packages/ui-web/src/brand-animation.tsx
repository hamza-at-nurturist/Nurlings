/// <reference path="./assets.d.ts" />
import { brand } from "@nurlings/brand";
import introUrl from "@nurlings/brand/assets/logo/nurlings-intro.svg";
import loaderUrl from "@nurlings/brand/assets/logo/nurlings-loader.svg";
import { useEffect, useState } from "react";
import { BrandMark } from "./brand-mark.js";
import { cn } from "./lib/utils.js";

const SOURCES = { intro: introUrl, loader: loaderUrl } as const;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Whether the person asked for less motion. The animation files carry their own media rule, but a
 * browser does not always apply the page's preference inside an image, so this is checked here too.
 */
function usePrefersReducedMotion(): boolean {
  const query = () =>
    typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION) : null;
  const [reduced, setReduced] = useState(() => query()?.matches ?? false);
  useEffect(() => {
    const media = query();
    if (!media) return;
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * The animated mark, as a plain image on the navy plate so the white blob reads on every theme.
 * `intro` plays once and then idles (sign-in, setup and the app's opening screen); `loader` loops
 * (full loading states). With prefers-reduced-motion, or if the image cannot load, the static mark
 * is drawn instead. Decorative: callers keep their text.
 */
export function BrandAnimation({
  variant,
  className,
}: {
  variant: keyof typeof SOURCES;
  /** Sizes the mark inside the plate, for example `h-12`. */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  return (
    <span
      aria-hidden="true"
      data-brand-animation={variant}
      className="inline-flex shrink-0 items-center justify-center rounded-[26px] p-3.5"
      style={{ backgroundColor: brand.colors.iconBackground, color: brand.colors.blob }}
    >
      {failed || reducedMotion ? (
        <BrandMark className={cn("h-12", className)} />
      ) : (
        <img
          src={SOURCES[variant]}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className={cn("h-12 w-auto select-none", className)}
        />
      )}
    </span>
  );
}
