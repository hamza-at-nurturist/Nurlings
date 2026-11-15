import { brand, brandText } from "@nurlings/brand";

/** Upstream test copy as this fork shows it: the product and agent names rebranded. */
export function branded(text: string): string {
  return brandText(text, brand);
}
