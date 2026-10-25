import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  dueWarningAt,
  enqueueDueTicketDates,
  nextTicketScheduleAt,
  resolveTicketDate,
  runTicketDates,
  ticketDateChanges,
} from "./ticket-dates.js";

const wake = vi.hoisted(() => vi.fn(async (_deps: unknown, _input: unknown) => {}));
const notify = vi.hoisted(() => vi.fn(async (_deps: unknown, _input: unknown) => {}));
vi.mock("./ticket-wake.js", () => ({ wakeTicketAssignee: wake }));
vi.mock("./ticket-changes.js", () => ({ notifyTicketUser: notify }));

const NONE = {
  startAt: null,
  startHasTime: false,
  dueAt: null,
  dueHasTime: false,
  startWokenAt: null,
  dueWarnedAt: null,
  overdueNotifiedAt: null,
};
const at = (iso: string) => new Date(iso);

describe("resolveTicketDate", () => {
  it("puts a date alone at 9 AM for a start and 23:59 for a due, local", () => {
    expect(resolveTicketDate("2026-10-30", "start", "America/New_York")).toEqual({
      at: at("2026-10-30T13:00:00Z"),
      hasTime: false,
    });
    expect(resolveTicketDate("2026-10-30", "due", "Pacific/Auckland")).toEqual({
      at: at("2026-10-30T10:59:00Z"),
      hasTime: false,
    });
    expect(resolveTicketDate("2026-10-30T15:00", "due", "UTC")).toEqual({
      at: at("2026-10-30T15:00:00Z"),
      hasTime: true,
    });
  });

  it("uses the offset of the day itself across DST changes", () => {
    // New York leaves daylight time on 1 November 2026.
    expect(resolveTicketDate("2026-10-31T09:00", "start", "America/New_York").at).toEqual(
      at("2026-10-31T13:00:00Z"),
    );
    expect(resolveTicketDate("2026-11-01T09:00", "start", "America/New_York").at).toEqual(
      at("2026-11-01T14:00:00Z"),
    );
    // 02:30 does not exist on 8 March 2026; it lands an hour on, at 03:30 daylight time.
    expect(resolveTicketDate("2026-03-08T02:30", "start", "America/New_York").at).toEqual(
      at("2026-03-08T07:30:00Z"),
    );
  });

  it("warns 3 hours before a timed due and at 9 AM on a date-only due", () => {
    expect(dueWarningAt(at("2026-10-30T19:00:00Z"), true)).toEqual(at("2026-10-30T16:00:00Z"));
    const due = resolveTicketDate("2026-11-01", "due", "America/New_York");
    expect(dueWarningAt(due.at, false)).toEqual(
      resolveTicketDate("2026-11-01T09:00", "start", "America/New_York").at,
    );
  });
});

describe("ticketDateChanges", () => {
  const now = at("2026-10-26T12:00:00Z");

  it("schedules the earliest pending reminder", () => {
    const { data } = ticketDateChanges(
      NONE,
      {
        start: { at: at("2026-10-28T13:00:00Z"), hasTime: false },
        due: { at: at("2026-10-27T19:00:00Z"), hasTime: true },
      },
      now,
    );
    expect(data).toMatchObject({
      startWokenAt: null,
      dueWarnedAt: null,
      overdueNotifiedAt: null,
      scheduleAt: at("2026-10-27T16:00:00Z"),
    });
  });

  it("skips reminders whose time has already passed", () => {
    const { data } = ticketDateChanges(
      NONE,
      {
        start: { at: at("2026-10-26T09:00:00Z"), hasTime: true },
        due: { at: at("2026-10-26T13:00:00Z"), hasTime: true },
      },
      now,
    );
    expect(data).toMatchObject({ startWokenAt: now, dueWarnedAt: now, overdueNotifiedAt: null });
    expect(data.scheduleAt).toEqual(at("2026-10-26T13:00:00Z"));
    const past = ticketDateChanges(
      NONE,
      { due: { at: at("2026-10-20T00:00:00Z"), hasTime: true } },
      now,
    );
    expect(past.data).toMatchObject({ dueWarnedAt: now, overdueNotifiedAt: now, scheduleAt: null });
  });

  it("resets the reminders of a changed date only, and leaves an unchanged date alone", () => {
    const current = {
      ...NONE,
      dueAt: at("2026-10-27T19:00:00Z"),
      dueHasTime: true,
      dueWarnedAt: at("2026-10-27T16:00:00Z"),
    };
    expect(
      ticketDateChanges(current, { due: { at: at("2026-10-27T19:00:00Z"), hasTime: true } }, now)
        .data,
    ).toEqual({});
    expect(
      ticketDateChanges(current, { due: { at: at("2026-11-03T19:00:00Z"), hasTime: true } }, now)
        .data,
    ).toMatchObject({ dueWarnedAt: null, overdueNotifiedAt: null });
  });

  it("releases a pending start that is cleared or moved to the past", () => {
    const pending = { ...NONE, startAt: at("2026-11-01T13:00:00Z") };
    expect(ticketDateChanges(pending, { start: null }, now).startReleased).toBe(true);
    expect(
      ticketDateChanges(pending, { start: { at: at("2026-10-01T13:00:00Z"), hasTime: false } }, now)
        .startReleased,
    ).toBe(true);
    expect(
      ticketDateChanges(pending, { start: { at: at("2026-11-08T13:00:00Z"), hasTime: false } }, now)
        .startReleased,
    ).toBe(false);
    expect(
      ticketDateChanges({ ...pending, startAt: at("2026-10-01T13:00:00Z") }, { start: null }, now)
        .startReleased,
    ).toBe(false);
  });

  it("finds nothing pending once every reminder is handled", () => {
    expect(
      nextTicketScheduleAt({
        ...NONE,
        startAt: now,
        startWokenAt: now,
        dueAt: now,
        dueWarnedAt: now,
        overdueNotifiedAt: now,
      }),
    ).toBeNull();
  });
});

describe("runTicketDates", () => {
  const now = at("2026-10-30T16:00:00Z");
  beforeEach(() => {
    vi.useFakeTimers({ now, toFake: ["Date"] });
    wake.mockClear();
    notify.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  function setup(overrides: Record<string, unknown>) {
    let row: Record<string, unknown> = {
      id: "t1",
      spaceId: "ws",
      number: 7,
      title: "Lease renewal",
      status: "doing",
      assigneeBotId: "bot-1",
      board: { ticketPrefix: "RAK" },
      assigneeBot: { userId: "user-1" },
      ...NONE,
      scheduleAt: now,
      ...overrides,
    };
    const tx = {
      $queryRaw: vi.fn(async () => []),
      ticket: {
        findFirst: vi.fn(async () => row),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          row = { ...row, ...data };
          return row;
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
      user: { findUnique: vi.fn(async () => ({ timezone: "America/New_York" })) },
    };
    const deps = { prisma, jobs: {}, ticketBoardEnabled: true } as never;
    return { deps, tx, row: () => row };
  }

  it("wakes the owner with the due prompt at the heads-up and schedules the overdue push", async () => {
    const s = setup({ dueAt: at("2026-10-30T19:00:00Z"), dueHasTime: true });
    await runTicketDates(s.deps, { ticketId: "t1" });
    expect(wake).toHaveBeenCalledWith(s.deps, {
      spaceId: "ws",
      ticketId: "t1",
      botId: "bot-1",
      prompt: expect.stringContaining("Ticket RAK-7 is due Fri, Oct 30, 3:00 PM."),
    });
    expect(s.row()).toMatchObject({ dueWarnedAt: now, scheduleAt: at("2026-10-30T19:00:00Z") });
    expect(notify).not.toHaveBeenCalled();
  });

  it("wakes once with the due prompt when the start and the heads-up come together", async () => {
    const s = setup({ startAt: now, dueAt: at("2026-10-31T03:59:00Z") });
    await runTicketDates(s.deps, { ticketId: "t1" });
    expect(wake).toHaveBeenCalledOnce();
    expect(wake).toHaveBeenCalledWith(
      s.deps,
      expect.objectContaining({ prompt: expect.stringContaining("by the end of Fri, Oct 30") }),
    );
  });

  it("wakes at the start with the usual prompt", async () => {
    const s = setup({ startAt: now });
    await runTicketDates(s.deps, { ticketId: "t1" });
    expect(wake).toHaveBeenCalledWith(s.deps, { spaceId: "ws", ticketId: "t1", botId: "bot-1" });
    expect(s.row()).toMatchObject({ startWokenAt: now, scheduleAt: null });
  });

  it("pushes the user once when the due passes", async () => {
    const s = setup({ dueAt: now, dueHasTime: true, dueWarnedAt: now });
    await runTicketDates(s.deps, { ticketId: "t1" });
    expect(notify).toHaveBeenCalledOnce();
    const input = notify.mock.calls[0]?.[1] as { title: () => string; body: string };
    expect(input).toMatchObject({ userId: "user-1", botId: "bot-1", body: "Lease renewal" });
    expect(input.title()).toBe("RAK-7 is overdue");
    expect(wake).not.toHaveBeenCalled();
  });

  it("marks reminders handled without acting on a ticket in review, done or won't do", async () => {
    for (const status of ["review", "done", "closed"]) {
      const s = setup({ status, startAt: now, dueAt: now, dueHasTime: true });
      await runTicketDates(s.deps, { ticketId: "t1" });
      expect(s.row()).toMatchObject({
        startWokenAt: now,
        dueWarnedAt: now,
        overdueNotifiedAt: now,
        scheduleAt: null,
      });
    }
    expect(wake).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does nothing for a stale job whose reminder moved later or was cleared", async () => {
    for (const scheduleAt of [at("2026-11-06T16:00:00Z"), null]) {
      const s = setup({ scheduleAt, dueAt: at("2026-11-06T19:00:00Z"), dueHasTime: true });
      await runTicketDates(s.deps, { ticketId: "t1" });
      expect(s.tx.ticket.update).not.toHaveBeenCalled();
    }
    expect(wake).not.toHaveBeenCalled();
  });

  it("does nothing while the board is off", async () => {
    const s = setup({ startAt: now });
    await runTicketDates({ ...(s.deps as object), ticketBoardEnabled: false } as never, {
      ticketId: "t1",
    });
    expect(s.tx.ticket.findFirst).not.toHaveBeenCalled();
  });
});

describe("enqueueDueTicketDates", () => {
  it("enqueues owned tickets whose reminder is within the lookahead, at that time", async () => {
    vi.useFakeTimers({ now: at("2026-10-30T16:00:00Z"), toFake: ["Date"] });
    try {
      const findMany = vi.fn(async () => [{ id: "t1", scheduleAt: at("2026-10-30T16:00:30Z") }]);
      const enqueue = vi.fn(async () => {});
      await enqueueDueTicketDates({ prisma: { ticket: { findMany } }, jobs: { enqueue } } as never);
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            scheduleAt: { lte: at("2026-10-30T16:01:00Z") },
            assigneeBotId: { not: null },
          },
        }),
      );
      expect(enqueue).toHaveBeenCalledWith({
        name: "ticket.dates",
        payload: { ticketId: "t1", scheduledFor: "2026-10-30T16:00:30.000Z" },
        availableAt: at("2026-10-30T16:00:30Z"),
        replaceKey: "ticket.dates:t1",
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
