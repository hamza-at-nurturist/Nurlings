import type { Ticket } from "@rakazo/contracts";

const DAY_MS = 86_400_000;

/** The calendar date of `instant` in `timeZone`, as `YYYY-MM-DD`. */
export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** The wall-clock time of `instant` in `timeZone`, as `HH:mm`. */
export function localTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** `YYYY-MM-DD` plus whole days, on the calendar alone. */
function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day! + days)).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both `YYYY-MM-DD`. */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00Z`) - Date.parse(`${from}T00:00Z`)) / DAY_MS);
}

function weekday(date: string): number {
  return new Date(`${date}T00:00Z`).getUTCDay();
}

/** Today, tomorrow, this weekend (Saturday, or today at the weekend) and next Monday. */
export function quickPickDates(now: Date, timeZone: string) {
  const today = localDate(now, timeZone);
  const day = weekday(today);
  return {
    today,
    tomorrow: addDays(today, 1),
    weekend: day === 0 || day === 6 ? today : addDays(today, 6 - day),
    nextWeek: addDays(today, (8 - day) % 7 || 7),
  };
}

export type RelativeDayLabels = { today: string; tomorrow: string; yesterday: string };

/** "Today", "Tomorrow", "Fri", "Nov 4" or "Nov 4, 2027", with " 3 PM" when there is a time. */
export function formatTicketDate(
  value: { at: string; hasTime: boolean },
  now: Date,
  timeZone: string,
  labels: RelativeDayLabels,
  locale = "en",
): string {
  const at = new Date(value.at);
  const date = localDate(at, timeZone);
  const offset = daysBetween(localDate(now, timeZone), date);
  const sameYear = date.slice(0, 4) === localDate(now, timeZone).slice(0, 4);
  const day =
    offset === 0
      ? labels.today
      : offset === 1
        ? labels.tomorrow
        : offset === -1
          ? labels.yesterday
          : offset > 1 && offset < 7
            ? new Intl.DateTimeFormat(locale, { timeZone, weekday: "short" }).format(at)
            : new Intl.DateTimeFormat(locale, {
                timeZone,
                month: "short",
                day: "numeric",
                ...(sameYear ? {} : { year: "numeric" }),
              }).format(at);
  if (!value.hasTime) return day;
  const minutes = localTime(at, timeZone).endsWith(":00") ? {} : { minute: "2-digit" as const };
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", ...minutes }).format(
    at,
  );
  return `${day} ${time}`;
}

/** A passed due counts only while the ticket still has work to do. */
export function isTicketOverdue(ticket: Pick<Ticket, "dueAt" | "status">, now: Date): boolean {
  return (
    Boolean(ticket.dueAt && Date.parse(ticket.dueAt) < now.getTime()) &&
    ["todo", "doing", "blocked"].includes(ticket.status)
  );
}
