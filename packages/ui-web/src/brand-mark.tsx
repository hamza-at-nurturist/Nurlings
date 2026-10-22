import { brand } from "@nurlings/brand";
import { cn } from "./lib/utils.js";

/**
 * The product's logo mark, drawn from the single path in the brand config and filled with the
 * surrounding text colour so it works on every theme. It is decorative next to the product name.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={brand.mark.viewBox}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
      className={cn("h-6 w-auto", className)}
    >
      <path d={brand.mark.path} />
    </svg>
  );
}
