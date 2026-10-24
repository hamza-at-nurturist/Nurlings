import { brand } from "@nurlings/brand";
import { tokens } from "@rakazo/ui-tokens";
import { useSyncExternalStore } from "react";
import { cn } from "./lib/utils.js";

// Transform parameters that place the blob body in the -60..60 avatar viewport.
const BLOB_SCALE = 0.0701;
const BLOB_TX = -921.5;
const BLOB_TY = -1003;

/** Pre-compute eye rect corners from the brand mark coordinates. */
function chiefEyeRects() {
  const { chiefEyeLeft, chiefEyeRight, chiefEyeAngleDeg } = brand.mark;
  const angle = (chiefEyeAngleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Eye centres in the 120-unit avatar space.
  const toAvatar = (cx: number, cy: number) => ({
    ax: (cx + BLOB_TX) * BLOB_SCALE,
    ay: (cy + BLOB_TY) * BLOB_SCALE,
  });
  // Un-rotate a point from the avatar frame into the rotate(angleDeg) group's local frame.
  const unrotate = (ax: number, ay: number) => ({
    lx: ax * cos + ay * sin,
    ly: -ax * sin + ay * cos,
  });
  const left = toAvatar(chiefEyeLeft.cx, chiefEyeLeft.cy);
  const right = toAvatar(chiefEyeRight.cx, chiefEyeRight.cy);
  const lLocal = unrotate(left.ax, left.ay);
  const rLocal = unrotate(right.ax, right.ay);
  // Rect top-left: centre minus half-dimensions.
  return {
    left: { x: lLocal.lx - 3.5, yCenter: lLocal.ly },
    right: { x: rLocal.lx - 3.5, yCenter: rLocal.ly },
  };
}

const EYE_RECTS = chiefEyeRects();

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
      <circle r="60" fill={brand.colors.iconBackground} />
      <g transform={`scale(${BLOB_SCALE}) translate(${BLOB_TX}, ${BLOB_TY})`}>
        <path d={brand.mark.blobBody} fill={brand.colors.blob} />
      </g>
      <g transform={`rotate(${brand.mark.chiefEyeAngleDeg})`}>
        {(["idle", "working"] as const).map((mode) => (
          <g
            key={mode}
            className={`rakazo-organic-avatar-eyes rakazo-organic-avatar-eyes-${mode}`}
            fill={tokens.background}
          >
            <rect
              x={EYE_RECTS.left.x}
              y={EYE_RECTS.left.yCenter - 12}
              width="7"
              height="24"
              rx="3.5"
            />
            <rect
              x={EYE_RECTS.right.x}
              y={EYE_RECTS.right.yCenter - 12}
              width="7"
              height="24"
              rx="3.5"
            />
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
