import { brand } from "@nurlings/brand";
import { CHIEF_AVATAR_RADIUS, chiefAvatarGeometry } from "@nurlings/brand/chief-avatar";
import { useSyncExternalStore } from "react";
import { cn } from "./lib/utils.js";

const { blobTransform, eyeTiltDeg, eyes } = chiefAvatarGeometry;

export function ChiefAvatar({
  size = 36,
  isWorking = false,
  className,
}: {
  size?: number;
  isWorking?: boolean;
  className?: string;
}) {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    reducedMotionSnapshot,
    () => false,
  );
  return (
    <svg
      viewBox="-60 -60 120 120"
      aria-hidden="true"
      className={cn("rakazo-organic-avatar overflow-visible select-none", className)}
      data-working={isWorking}
      data-eye-pattern="0"
      data-reduced-motion={reducedMotion}
      style={{
        width: size,
        height: size,
        flex: "none",
        filter: isWorking ? `drop-shadow(0 0 ${Math.round(size * 0.16)}px #4FFFDB)` : undefined,
      }}
    >
      <circle r={CHIEF_AVATAR_RADIUS} fill={brand.colors.iconBackground} />
      <path d={brand.mark.blobBody} transform={blobTransform} fill={brand.colors.blob} />
      <g transform={`rotate(${eyeTiltDeg})`}>
        {(["idle", "working"] as const).map((mode) => (
          <g
            key={mode}
            className={`rakazo-organic-avatar-eyes rakazo-organic-avatar-eyes-${mode}`}
            fill={brand.colors.iconBackground}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            {eyes.map((eye) => (
              <rect
                key={eye.x}
                x={eye.x}
                y={eye.y}
                width={eye.width}
                height={eye.height}
                rx={eye.radius}
              />
            ))}
          </g>
        ))}
      </g>
    </svg>
  );
}

const reducedMotionMedia = "(prefers-reduced-motion: reduce)";

function reducedMotionSnapshot(): boolean {
  return window.matchMedia(reducedMotionMedia).matches;
}

function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(reducedMotionMedia);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
