import { expect, it } from "vitest";
import { formatTicketDate, isTicketOverdue, quickPickDates } from "./dates";

const NY = "America/New_York";
const labels = { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" };
// Monday 26 October 2026, 11 PM in New York (already Tuesday in UTC).
const now = new Date("2026-10-27T03:00:00Z");
const show = (at: string, hasTime = false) => formatTicketDate({ at, hasTime }, now, NY, labels);

it("picks today, tomorrow, Saturday and next Monday in the user's timezone", () => {
  expect(quickPickDates(now, NY)).toEqual({
    today: "2026-10-26",
    tomorrow: "2026-10-27",
    weekend: "2026-10-31",
    nextWeek: "2026-11-02",
  });
  // At the weekend, this weekend is today; next week is still the coming Monday.
  expect(quickPickDates(new Date("2026-11-01T15:00:00Z"), NY)).toMatchObject({
    weekend: "2026-11-01",
    nextWeek: "2026-11-02",
  });
});

it("reads dates short and relative", () => {
  expect(show("2026-10-27T03:59:00Z")).toBe("Today");
  expect(show("2026-10-27T13:00:00Z")).toBe("Tomorrow");
  expect(show("2026-10-26T03:59:00Z")).toBe("Yesterday");
  expect(show("2026-10-30T19:00:00Z", true)).toBe("Fri 3 PM");
  expect(show("2026-10-30T19:30:00Z", true)).toBe("Fri 3:30 PM");
  expect(show("2026-11-05T04:59:00Z")).toBe("Nov 4");
  expect(show("2027-11-05T03:59:00Z")).toBe("Nov 4, 2027");
});

it("counts a passed due as overdue only while there is work left", () => {
  const dueAt = "2026-10-26T00:00:00Z";
  expect(isTicketOverdue({ dueAt, status: "doing" }, now)).toBe(true);
  expect(isTicketOverdue({ dueAt, status: "review" }, now)).toBe(false);
  expect(isTicketOverdue({ dueAt, status: "done" }, now)).toBe(false);
  expect(isTicketOverdue({ dueAt: "2026-11-26T00:00:00Z", status: "doing" }, now)).toBe(false);
  expect(isTicketOverdue({ dueAt: null, status: "doing" }, now)).toBe(false);
});
