import type { JobPublisher, NotificationProvider } from "@rakazo/adapter-kit";
import { ticketDatesJob } from "@rakazo/adapter-kit";
import type { TicketDateKind, TicketStatus } from "@rakazo/contracts";
import {
  TICKET_START_AFTER_DUE_ERROR,
  TicketStatusSchema,
  ticketLocalDateTime,
  ticketRef,
} from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import { userTimeZone } from "./schedule-tools.js";
import { notifyTicketUser } from "./ticket-changes.js";
import { wakeTicketAssignee } from "./ticket-wake.js";

/** A heads-up comes this long before a due with a time. */
const DUE_WARNING_MS = 3 * 3_600_000;
/** A due without a time is stored at 23:59 local; its heads-up is 9:00 that morning. */
const DATE_ONLY_WARNING_MS = (14 * 60 + 59) * 60_000;
/** The reconciler's lookahead, as for routines. */
const LOOKAHEAD_MS = 60_000;
const BATCH_SIZE = 100;
/** Worker and database clocks may differ a little; a job that runs early still counts. */
const CLOCK_SKEW_MS = 5_000;

export type ResolvedTicketDate = { at: Date; hasTime: boolean };

type DateState = {
  startAt: Date | null;
  dueAt: Date | null;
  dueHasTime: boolean;
  startWokenAt: Date | null;
  dueWarnedAt: Date | null;
  overdueNotifiedAt: Date | null;
};

/** The wall-clock offset of `timeZone` at `instant`, in milliseconds. */
function zoneOffset(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  const local = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return local - Math.floor(instant / 1000) * 1000;
}

/**
 * A ticket date input (local, no offset) as an instant in `timeZone`. A date alone means 9 AM for
 * a start and 23:59 for a due. A time skipped by a DST change lands just after it.
 */
export function resolveTicketDate(
  value: string,
  kind: TicketDateKind,
  timeZone: string,
): ResolvedTicketDate {
  const [date = "", time = ""] = ticketLocalDateTime(value, kind).split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const wall = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  // The offset at the guess can differ from the offset at the answer near a DST change. A time in
  // the gap has no answer; the first guess then lands just after the gap.
  const guess = wall - zoneOffset(wall, timeZone);
  const corrected = wall - zoneOffset(guess, timeZone);
  const at = zoneOffset(corrected, timeZone) === wall - corrected ? corrected : guess;
  return { at: new Date(at), hasTime: value.includes("T") };
}

export function dueWarningAt(dueAt: Date, dueHasTime: boolean): Date {
  return new Date(dueAt.getTime() - (dueHasTime ? DUE_WARNING_MS : DATE_ONLY_WARNING_MS));
}

/** The earliest date reminder still pending, or null when none is. */
export function nextTicketScheduleAt(state: DateState): Date | null {
  const pending: Date[] = [];
  if (state.startAt && !state.startWokenAt) pending.push(state.startAt);
  if (state.dueAt && !state.dueWarnedAt) pending.push(dueWarningAt(state.dueAt, state.dueHasTime));
  if (state.dueAt && !state.overdueNotifiedAt) pending.push(state.dueAt);
  return pending.length ? new Date(Math.min(...pending.map((at) => at.getTime()))) : null;
}

/** Date wakes and the overdue push skip a ticket that is In review, Done or Won't do. */
export function isTicketDateOpen(status: string): boolean {
  const parsed = TicketStatusSchema.safeParse(status);
  const open: TicketStatus[] = ["todo", "doing", "blocked"];
  return parsed.success && open.includes(parsed.data);
}

/** A start still in the future holds back the assignment wake until it arrives. */
export function isTicketStartPending(
  state: Pick<DateState, "startAt" | "startWokenAt">,
  now: Date,
) {
  return Boolean(state.startAt && !state.startWokenAt && state.startAt > now);
}

function sameDate(at: Date | null, hasTime: boolean, next: ResolvedTicketDate | null) {
  return next ? at?.getTime() === next.at.getTime() && hasTime === next.hasTime : at === null;
}

/**
 * The columns to write for a date change. A changed date resets its own reminders, except one whose
 * time has already passed, which is marked handled so it never fires late. `startReleased` is set
 * when a start that was still to come is cleared or moved to now or earlier.
 */
export function ticketDateChanges(
  current: DateState & { startHasTime: boolean },
  change: DateChange,
  now: Date,
) {
  const data: Partial<DateState & { startHasTime: boolean; scheduleAt: Date | null }> = {};
  let startReleased = false;
  const { start, due } = change;
  if (start !== undefined && !sameDate(current.startAt, current.startHasTime, start)) {
    const future = Boolean(start && start.at > now);
    startReleased = isTicketStartPending(current, now) && !future;
    data.startAt = start?.at ?? null;
    data.startHasTime = start?.hasTime ?? false;
    data.startWokenAt = future ? null : now;
  }
  if (due !== undefined && !sameDate(current.dueAt, current.dueHasTime, due)) {
    data.dueAt = due?.at ?? null;
    data.dueHasTime = due?.hasTime ?? false;
    data.dueWarnedAt = due && dueWarningAt(due.at, due.hasTime) > now ? null : now;
    data.overdueNotifiedAt = due && due.at > now ? null : now;
  }
  if (Object.keys(data).length === 0) return { data, startReleased };
  data.scheduleAt = nextTicketScheduleAt({ ...current, ...data });
  return { data, startReleased };
}

type DateChange = { start?: ResolvedTicketDate | null; due?: ResolvedTicketDate | null };

/** Resolves `start` / `due` input in the acting user's saved timezone; omitted stays omitted. */
export async function resolveTicketDateInput(
  prisma: PrismaClient,
  userId: string,
  input: { start?: string | null; due?: string | null },
): Promise<DateChange> {
  if (input.start === undefined && input.due === undefined) return {};
  const timeZone = await userTimeZone(prisma, userId);
  const change: DateChange = {};
  if (input.start !== undefined)
    change.start = input.start === null ? null : resolveTicketDate(input.start, "start", timeZone);
  if (input.due !== undefined)
    change.due = input.due === null ? null : resolveTicketDate(input.due, "due", timeZone);
  return change;
}

/** A start after the due is refused, counting a stored date the change leaves alone. */
export function ticketDateOrderError(
  change: DateChange,
  stored: { startAt: Date | null; dueAt: Date | null },
): string | null {
  const startAt = change.start === undefined ? stored.startAt : (change.start?.at ?? null);
  const dueAt = change.due === undefined ? stored.dueAt : (change.due?.at ?? null);
  return startAt && dueAt && startAt > dueAt ? TICKET_START_AFTER_DUE_ERROR : null;
}

/** What the owner is told before a ticket's due. */
export function ticketDueWakePrompt(ref: string, when: string): string {
  return `Ticket ${ref} is due ${when}. Read it with ticket_get. Finish it, or comment on the ticket to tell the user what is blocking it, and keep its status current with ticket_update.`;
}

function formatDue(dueAt: Date, hasTime: boolean, timeZone: string): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(dueAt);
  if (!hasTime) return `by the end of ${day}`;
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(dueAt);
  return `${day}, ${time}`;
}

/**
 * Reconciler pass: enqueue a `ticket.dates` job for each ticket whose next reminder falls within
 * the lookahead, the way routines are found by `nextRunAt`. Tickets without an owner wait.
 */
export async function enqueueDueTicketDates(deps: { prisma: PrismaClient; jobs: JobPublisher }) {
  const rows = await deps.prisma.ticket.findMany({
    where: {
      scheduleAt: { lte: new Date(Date.now() + LOOKAHEAD_MS) },
      assigneeBotId: { not: null },
    },
    orderBy: [{ scheduleAt: "asc" }, { id: "asc" }],
    take: BATCH_SIZE,
    select: { id: true, scheduleAt: true },
  });
  await Promise.all(
    rows.flatMap((row) =>
      row.scheduleAt ? [deps.jobs.enqueue(ticketDatesJob(row.id, row.scheduleAt))] : [],
    ),
  );
}

/**
 * The `ticket.dates` job. It re-reads the ticket under its row lock and does nothing when the next
 * reminder has moved later or gone, so a stale job is a no-op. Each reminder that is due is marked
 * handled, and acted on only while the ticket has an owner and is still open.
 */
export async function runTicketDates(
  deps: {
    prisma: PrismaClient;
    jobs: JobPublisher;
    ticketBoardEnabled?: boolean;
    notifications?: () => NotificationProvider | undefined;
  },
  input: { ticketId: string },
): Promise<void> {
  if (!deps.ticketBoardEnabled) return;
  const now = new Date();
  const cutoff = new Date(now.getTime() + CLOCK_SKEW_MS);
  const outcome = await deps.prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${input.ticketId} FOR UPDATE`;
    const row = await tx.ticket.findFirst({
      where: { id: input.ticketId },
      include: {
        board: { select: { ticketPrefix: true } },
        assigneeBot: { select: { userId: true } },
      },
    });
    if (!row?.scheduleAt || row.scheduleAt > cutoff) return null;
    const open = Boolean(row.assigneeBotId) && isTicketDateOpen(row.status);
    const data: Partial<DateState> = {};
    let wake: "start" | "due" | null = null;
    let overdue = false;
    if (row.startAt && !row.startWokenAt && row.startAt <= cutoff) {
      data.startWokenAt = now;
      if (open) wake = "start";
    }
    if (row.dueAt && !row.dueWarnedAt && dueWarningAt(row.dueAt, row.dueHasTime) <= cutoff) {
      data.dueWarnedAt = now;
      if (open && row.dueAt > now) wake = "due";
    }
    if (row.dueAt && !row.overdueNotifiedAt && row.dueAt <= cutoff) {
      data.overdueNotifiedAt = now;
      if (open) overdue = true;
    }
    await tx.ticket.update({
      where: { id: row.id },
      data: { ...data, scheduleAt: nextTicketScheduleAt({ ...row, ...data }) },
    });
    return { row, wake, overdue };
  });
  const row = outcome?.row;
  const botId = row?.assigneeBotId;
  const userId = row?.assigneeBot?.userId;
  if (!outcome || !row || !botId || !userId) return;
  const ref = ticketRef(row.board.ticketPrefix, row.number);
  if (outcome.wake) {
    const prompt =
      outcome.wake === "due" && row.dueAt
        ? ticketDueWakePrompt(
            ref,
            formatDue(row.dueAt, row.dueHasTime, await userTimeZone(deps.prisma, userId)),
          )
        : undefined;
    await wakeTicketAssignee(deps, {
      spaceId: row.spaceId,
      ticketId: row.id,
      botId,
      ...(prompt ? { prompt } : {}),
    });
  }
  if (outcome.overdue) {
    await notifyTicketUser(deps, {
      spaceId: row.spaceId,
      userId,
      botId,
      title: () => `${ref} is overdue`,
      body: row.title,
    });
  }
}
