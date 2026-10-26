import type { TicketDateKind } from "@rakazo/contracts";
import { localDate } from "@rakazo/core/nurlings-board";

/** The `YYYY-MM-DD` a picked device-local Date stands for. */
export function pickedDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * A Date for the native picker to open on: the ticket's date in the user's timezone, else today.
 * Built at noon so the device's own zone cannot move it to the next or previous day.
 */
export function pickerStart(value: string | null, timeZone: string, now: Date): Date {
  const [year, month, day] = localDate(value ? new Date(value) : now, timeZone)
    .split("-")
    .map(Number);
  return new Date(year!, month! - 1, day!, 12);
}

/** The ticket update that sets, or with null clears, one date. */
export function dateUpdate(
  id: string,
  kind: TicketDateKind,
  value: string | null,
): { id: string; start?: string | null; due?: string | null } {
  return kind === "start" ? { id, start: value } : { id, due: value };
}
