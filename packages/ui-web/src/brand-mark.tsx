import { brand } from "@nurlings/brand";
import { useId } from "react";
import { cn } from "./lib/utils.js";

/**
 * The product's logo mark, drawn from the brand configuration. The blob takes the surrounding
 * text colour so it reads on every theme (set it to the brand white on the navy icon plate); the
 * orb keeps its gradient. `small` is the blob alone, for places too small for the orb's eyes. It is
 * decorative next to the product name.
 */
export function BrandMark({
  className,
  variant = "full",
}: {
  className?: string;
  variant?: "full" | "small";
}) {
  const gradientId = `${useId()}-orb`;
  const { x1, y1, x2, y2 } = brand.mark.orbGradient;
  const [start, middle, end] = brand.colors.orbGradient;
  const small = variant === "small";
  return (
    <svg
      viewBox={small ? brand.mark.smallViewBox : brand.mark.viewBox}
      aria-hidden="true"
      focusable="false"
      className={cn("h-6 w-auto", className)}
    >
      {small ? null : (
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" {...{ x1, y1, x2, y2 }}>
            <stop offset="0" stopColor={start} />
            <stop offset="0.5" stopColor={middle} />
            <stop offset="1" stopColor={end} />
          </linearGradient>
        </defs>
      )}
      <path d={brand.mark.blob} fill="currentColor" fillRule="evenodd" />
      {small ? null : <path d={brand.mark.orb} fill={`url(#${gradientId})`} fillRule="evenodd" />}
    </svg>
  );
}
