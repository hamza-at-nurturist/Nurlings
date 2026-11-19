import { brand } from "@nurlings/brand";

/**
 * How a compacted-history summary introduces itself to the model. The prefix names the brand; the
 * upstream wording is still recognised so a summary written under it (for example in imported
 * data) is treated the same way.
 */
export const COMPACTED_SUMMARY_PREFIX = `${brand.name}-owned compacted context through message sequence `;
export const LEGACY_COMPACTED_SUMMARY_PREFIX =
  "Rakazo-owned compacted context through message sequence ";

export function isCompactedSummaryText(text: string): boolean {
  return (
    text.startsWith(COMPACTED_SUMMARY_PREFIX) || text.startsWith(LEGACY_COMPACTED_SUMMARY_PREFIX)
  );
}
