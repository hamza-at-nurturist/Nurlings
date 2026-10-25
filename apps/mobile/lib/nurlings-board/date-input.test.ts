import { describe, expect, it } from "vitest";
import { dateUpdate, pickedDateInput, pickerStart } from "./date-input";

describe("date input", () => {
  it("writes a picked date as YYYY-MM-DD with the device's calendar day", () => {
    expect(pickedDateInput(new Date(2026, 9, 5, 23, 30))).toBe("2026-10-05");
    expect(pickedDateInput(new Date(2027, 0, 31, 0, 5))).toBe("2027-01-31");
  });

  it("opens the picker on the ticket's day in the user's timezone, at noon", () => {
    // 2026-10-26 02:00 UTC is still the 25th in Los Angeles.
    const start = pickerStart("2026-10-26T02:00:00.000Z", "America/Los_Angeles", new Date());
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours()]).toEqual([
      2026, 9, 25, 12,
    ]);
  });

  it("opens on today when the ticket has no date", () => {
    const start = pickerStart(null, "UTC", new Date("2026-10-25T12:00:00.000Z"));
    expect(pickedDateInput(start)).toBe("2026-10-25");
  });

  it("builds the update for start and due, with null clearing", () => {
    expect(dateUpdate("t1", "due", "2026-10-30")).toEqual({ id: "t1", due: "2026-10-30" });
    expect(dateUpdate("t1", "start", null)).toEqual({ id: "t1", start: null });
  });
});
