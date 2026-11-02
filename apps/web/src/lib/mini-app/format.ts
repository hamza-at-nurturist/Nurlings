export type ValueFormat = "number" | "currency" | "percent";

/** A number from a number or a numeric string; null for anything else. */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Whatever a prop resolved to, as text. Objects and arrays draw as nothing. */
export function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/**
 * A value as the person reads it. Currency is a three-letter code (USD when missing or invalid);
 * percent takes percentage points, so 12.5 is 12.5%. Anything that is not a number draws as the
 * text it is.
 */
export function formatValue(
  value: unknown,
  format?: ValueFormat | null,
  currency?: string | null,
  locale?: string,
): string {
  const number = toNumber(value);
  if (number === null || !format) return asText(value);
  if (format === "currency") {
    const code = currency && /^[A-Z]{3}$/.test(currency) ? currency : "USD";
    return new Intl.NumberFormat(locale, { style: "currency", currency: code }).format(number);
  }
  if (format === "percent") {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(number)}%`;
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(number);
}
