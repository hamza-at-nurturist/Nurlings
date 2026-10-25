import { describe, expect, it, vi } from "vitest";
import {
  commentTicket,
  createTicket,
  getTicket,
  listBoardTickets,
  updateTicket,
} from "./ticket-tools.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function board(overrides: Record<string, unknown> = {}) {
  return {
    id: "board-1",
    spaceId: "ws",
    name: "Personal",
    ticketPrefix: "RAK",
    nextNumber: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function boardSpace() {
  const row = board();
  return {
    board: {
      findUnique: vi.fn(async () => row),
      createMany: vi.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: vi.fn(async () => row),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...row, ...data })),
    },
    space: { findUnique: vi.fn(async () => ({ name: "Personal" })) },
  };
}

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    boardId: "board-1",
    spaceId: "ws",
    number: 1,
    title: "Ticket",
    description: null,
    status: "todo",
    priority: null,
    assigneeBotId: "bot-1",
    createdByBotId: null,
    createdByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    needsUser: false,
    startAt: null,
    startHasTime: false,
    dueAt: null,
    dueHasTime: false,
    startWokenAt: null,
    dueWarnedAt: null,
    overdueNotifiedAt: null,
    scheduleAt: null,
    ...overrides,
  };
}

describe("ticket tools", () => {
  it("lists tickets strictly within the space and board", async () => {
    const findMany = vi.fn(async () => [ticket({ number: 1, status: "doing" })]);
    const prisma = {
      ...boardSpace(),
      ticket: { findMany },
    };

    const result = await listBoardTickets({ prisma, ticketBoardEnabled: true } as never, {
      spaceId: "ws",
      status: "doing",
    });

    expect(findMany).toHaveBeenCalledWith({
      where: { spaceId: "ws", boardId: "board-1", status: "doing" },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
    });
    expect(result).toEqual({ tickets: [expect.objectContaining({ ref: "RAK-1" })] });
  });

  it("leaves closed tickets out of an unfiltered list and shortens descriptions", async () => {
    const findMany = vi.fn(async () => [ticket({ number: 2, description: "x".repeat(500) })]);
    const prisma = { ...boardSpace(), ticket: { findMany } };

    const result = await listBoardTickets({ prisma, ticketBoardEnabled: true } as never, {
      spaceId: "ws",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceId: "ws", boardId: "board-1", status: { not: "closed" } },
        take: 51,
      }),
    );
    const listed = (result as { tickets: { description: string }[] }).tickets[0]!;
    expect(listed.description).toHaveLength(200);
    expect(listed.description.endsWith("…")).toBe(true);
  });

  it("pages older tickets with a cursor and rejects a bad one", async () => {
    const rows = Array.from({ length: 51 }, (_, index) =>
      ticket({
        id: `t${String(index).padStart(2, "0")}`,
        number: index + 1,
        createdAt: new Date(NOW.getTime() - index * 1000),
      }),
    );
    const findMany = vi.fn(async (_query: unknown) => rows);
    const prisma = { ...boardSpace(), ticket: { findMany } };

    const first = await listBoardTickets({ prisma, ticketBoardEnabled: true } as never, {
      spaceId: "ws",
    });
    expect(first).toEqual({
      tickets: expect.any(Array),
      nextCursor: expect.any(String),
    });
    const page = first as { tickets: { id: string }[]; nextCursor: string };
    expect(page.tickets).toHaveLength(50);
    expect(page.tickets[49]?.id).toBe("t49");

    await listBoardTickets({ prisma, ticketBoardEnabled: true } as never, {
      spaceId: "ws",
      cursor: page.nextCursor,
    });
    expect(findMany.mock.calls[1]?.[0]).toEqual({
      where: {
        spaceId: "ws",
        boardId: "board-1",
        status: { not: "closed" },
        OR: [
          { createdAt: { lt: rows[49]!.createdAt } },
          { createdAt: rows[49]!.createdAt, id: { lt: "t49" } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51,
    });

    const invalid = await listBoardTickets({ prisma, ticketBoardEnabled: true } as never, {
      spaceId: "ws",
      cursor: "not-a-cursor",
    });
    expect(invalid).toEqual({ error: "cursor is invalid." });
  });
});

function mutationDeps(ticketBoardEnabled = true) {
  let current = ticket();
  const mentionTask = vi.fn(
    async (_query: unknown): Promise<{ id: string; createdAt: Date } | null> => null,
  );
  const priorReplies = vi.fn(async (_query: unknown) => 0);
  const changes = vi.fn(async (_change: { wakeAssignee: boolean }) => {});
  const tx = {
    board: { update: vi.fn(async () => ({ nextNumber: 2 })) },
    ticket: {
      findFirst: vi.fn(async () => current),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = ticket(data);
        return current;
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = { ...current, ...data };
        return current;
      }),
    },
    ticketComment: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: "comment-1",
        createdAt: NOW,
        updatedAt: NOW,
        authorBot: { name: "Planner" },
        authorUser: null,
        ...data,
      })),
      count: priorReplies,
    },
    task: { findFirst: mentionTask },
    ticketEvent: { create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({})) },
    $queryRaw: vi.fn(async () => []),
  };
  const prisma = {
    ...boardSpace(),
    bot: {
      findFirst: vi.fn(async () => ({ id: "bot-2" })),
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.filter((id) => id !== "foreign").map((id) => ({ id })),
      ),
    },
    ticket: tx.ticket,
    user: { findUnique: vi.fn(async () => ({ timezone: "America/New_York" })) },
    ticketComment: { findMany: vi.fn(async () => []), count: priorReplies },
    task: { findFirst: mentionTask },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  return {
    deps: { prisma, onTicketChange: changes, ticketBoardEnabled } as never,
    prisma,
    tx,
    changes,
    mentionTask,
    priorReplies,
    setTicket: (overrides: Record<string, unknown>) => {
      current = { ...current, ...overrides };
    },
    current: () => current,
  };
}

describe("ticket mutations", () => {
  it("disables every tool without database access or wake-ups", async () => {
    const s = mutationDeps(false);
    await createTicket(s.deps, { spaceId: "ws", userId: "user-1", botId: "bot-1", title: "Ship" });
    await updateTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      botId: "bot-1",
      id: "t1",
      ownerBotId: "bot-2",
    });
    await commentTicket(s.deps, { spaceId: "ws", botId: "bot-1", id: "t1", body: "Ready" });
    await listBoardTickets(s.deps, { spaceId: "ws" });
    await getTicket(s.deps, { spaceId: "ws", ref: "RAK-1" });
    expect(s.prisma.board.findUnique).not.toHaveBeenCalled();
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
    expect(s.changes).not.toHaveBeenCalled();
  });
  it("allocates a number and wakes the assigned bot once", async () => {
    const s = mutationDeps();
    const result = await createTicket(s.deps, {
      spaceId: "ws",
      botId: "bot-1",
      userId: "user-1",
      title: "  Ship  ",
      ownerBotId: "bot-2",
    });
    expect(result).toEqual({
      ticket: expect.objectContaining({ ref: "RAK-1", title: "Ship", assigneeBotId: "bot-2" }),
    });
    expect(s.tx.board.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nextNumber: { increment: 1 } } }),
    );
    expect(s.changes).toHaveBeenCalledOnce();
    expect(s.changes).toHaveBeenCalledWith(expect.objectContaining({ wakeAssignee: true }));
  });
  it("wakes on an actual reassignment once, and never on status edits or repeated assignment", async () => {
    const s = mutationDeps();
    await updateTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      id: "t1",
      ownerBotId: "bot-2",
      status: "doing",
    });
    expect(s.changes).toHaveBeenCalledWith(
      expect.objectContaining({ wakeAssignee: true, assigneeBotId: "bot-2" }),
    );
    await updateTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      id: "t1",
      ownerBotId: "bot-2",
      status: "done",
    });
    expect(
      s.changes.mock.calls.map(([value]) => (value as { wakeAssignee: boolean }).wakeAssignee),
    ).toEqual([true, false]);
    expect(s.tx.ticket.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "done", completedAt: expect.any(Date) }),
      }),
    );
  });
  it("does not wake a bot creating or assigning a ticket to itself", async () => {
    const s = mutationDeps();
    await createTicket(s.deps, { spaceId: "ws", userId: "user-1", botId: "bot-1", title: "Ship" });
    await updateTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      id: "t1",
      ownerBotId: "bot-2",
      botId: "bot-2",
    });
    expect(s.changes.mock.calls.map(([value]) => value.wakeAssignee)).toEqual([false, false]);
  });
  it("records a created event with the actor and the owner", async () => {
    const s = mutationDeps();
    await createTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      title: "Ship",
      ownerBotId: "bot-2",
    });
    expect(s.tx.ticketEvent.create).toHaveBeenCalledOnce();
    expect(s.tx.ticketEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "created",
        actorUserId: "user-1",
        actorBotId: null,
        assigneeBotId: "bot-2",
        status: null,
      }),
    });
  });
  it("records status and owner events only for what actually changed, attributed to the actor", async () => {
    const s = mutationDeps();
    await updateTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      botId: "bot-1",
      id: "t1",
      status: "blocked",
      ownerBotId: "bot-2",
    });
    expect(s.tx.ticketEvent.create.mock.calls.map(([arg]) => arg.data)).toEqual([
      expect.objectContaining({
        kind: "status",
        status: "blocked",
        actorBotId: "bot-1",
        actorUserId: null,
      }),
      expect.objectContaining({ kind: "owner", assigneeBotId: "bot-2", actorBotId: "bot-1" }),
    ]);
    s.tx.ticketEvent.create.mockClear();
    // Same status and owner again, and an edit that touches neither.
    await updateTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      id: "t1",
      status: "blocked",
      ownerBotId: "bot-2",
    });
    await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", title: "Renamed" });
    expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
  });
  it("attributes a user's status change to the user", async () => {
    const s = mutationDeps();
    await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", status: "doing" });
    expect(s.tx.ticketEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ kind: "status", actorUserId: "user-1", actorBotId: null }),
    });
  });
  it("wakes the owner for a user's comment and for nobody else's", async () => {
    const s = mutationDeps();
    await commentTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", body: "Any news?" });
    expect(s.changes).toHaveBeenLastCalledWith(
      expect.objectContaining({ wakeAssignee: true, assigneeBotId: "bot-1" }),
    );
    // A Nurling's comment carries its owner's user id too, but is not a user's comment.
    await commentTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      botId: "bot-1",
      id: "t1",
      body: "Looking",
    });
    expect(s.changes).toHaveBeenLastCalledWith(expect.objectContaining({ wakeAssignee: false }));
  });
  it("comments without waking the owner", async () => {
    const s = mutationDeps();
    const result = await commentTicket(s.deps, {
      spaceId: "ws",
      botId: "bot-1",
      id: "t1",
      body: " Ready ",
    });
    expect(result).toHaveProperty("comment.authorName", "Planner");
    expect(s.tx.ticketComment.create).toHaveBeenCalledWith({
      include: { authorBot: { select: { name: true } }, authorUser: { select: { name: true } } },
      data: expect.objectContaining({ body: "Ready", ticketId: "t1" }),
    });
    expect(s.changes).toHaveBeenCalledWith(expect.objectContaining({ wakeAssignee: false }));
  });
  it("reads tickets with their comments", async () => {
    const s = mutationDeps();
    await expect(getTicket(s.deps, { spaceId: "ws", ref: "RAK-1" })).resolves.toEqual({
      ticket: expect.objectContaining({ ref: "RAK-1" }),
      comments: [],
    });
    expect(s.prisma.ticket.findFirst).toHaveBeenCalledWith({
      where: { number: 1, spaceId: "ws", boardId: "board-1" },
    });
  });
  it("only assigns the acting user's own bots", async () => {
    const s = mutationDeps();
    s.prisma.bot.findFirst.mockResolvedValue(null as never);
    await expect(
      createTicket(s.deps, {
        spaceId: "ws",
        botId: "bot-1",
        userId: "user-1",
        title: "Ship",
        ownerBotId: "other-members-bot",
      }),
    ).resolves.toEqual({ error: "Unknown bot." });
    await expect(
      updateTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        id: "t1",
        ownerBotId: "other-members-bot",
      }),
    ).resolves.toEqual({ error: "Unknown bot." });
    for (const [query] of s.prisma.bot.findFirst.mock.calls as unknown as [unknown][]) {
      expect(query).toEqual({
        where: { id: "other-members-bot", spaceId: "ws", userId: "user-1", archivedAt: null },
        select: { id: true },
      });
    }
    expect(s.prisma.bot.findFirst).toHaveBeenCalledTimes(2);
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
    expect(s.changes).not.toHaveBeenCalled();
  });
  it("rejects invalid input and foreign owners before a write", async () => {
    const s = mutationDeps();
    await expect(
      createTicket(s.deps, { spaceId: "ws", userId: "user-1", botId: "bot-1", title: " " }),
    ).resolves.toHaveProperty("error");
    s.prisma.bot.findFirst.mockResolvedValueOnce(null as never);
    await expect(
      updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", ownerBotId: "foreign" }),
    ).resolves.toHaveProperty("error");
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
  });

  describe("mentions", () => {
    it("stores valid Nurlings and drops foreign, archived or unknown ids, then wakes only those", async () => {
      const s = mutationDeps();
      await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        id: "t1",
        body: "@Scout please look",
        mentions: [
          { kind: "bot", id: "bot-2" },
          { kind: "bot", id: "foreign" },
          { kind: "bot", id: "bot-2" },
        ],
      });
      expect(s.prisma.bot.findMany).toHaveBeenCalledWith({
        where: {
          id: { in: ["bot-2", "foreign"] },
          spaceId: "ws",
          userId: "user-1",
          archivedAt: null,
        },
        select: { id: true },
      });
      expect(s.tx.ticketComment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mentions: [{ kind: "bot", id: "bot-2" }] }),
        }),
      );
      expect(s.changes).toHaveBeenLastCalledWith(
        expect.objectContaining({ mentionBotIds: ["bot-2"], userId: "user-1" }),
      );
    });
    it("ignores a user mention from a user, and forces a Nurling's user mention to its own user", async () => {
      const s = mutationDeps();
      await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        id: "t1",
        body: "hi",
        mentions: [{ kind: "user", id: "someone-else" }],
      });
      expect(s.tx.ticketComment.create).toHaveBeenLastCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ mentions: [] }) }),
      );
      await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-1",
        id: "t1",
        body: "@Ada I need you",
        mentionUser: true,
        mentions: [{ kind: "user", id: "someone-else" }],
      });
      expect(s.tx.ticketComment.create).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ mentions: [{ kind: "user", id: "user-1" }] }),
        }),
      );
      expect(s.changes).toHaveBeenLastCalledWith(
        expect.objectContaining({
          commentBotId: "bot-1",
          mentionedUser: { ref: "RAK-1", body: "@Ada I need you" },
        }),
      );
    });
    it("stores a mention whose @Name is not in the text", async () => {
      const s = mutationDeps();
      await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-1",
        id: "t1",
        body: "Need a second opinion",
        mentionBotIds: ["bot-2"],
      });
      expect(s.changes).toHaveBeenLastCalledWith(
        expect.objectContaining({ mentionBotIds: ["bot-2"], commentBotId: "bot-1" }),
      );
    });
    it("lets a mention-woken Nurling comment once and refuses the second", async () => {
      const s = mutationDeps();
      const task = { id: "task-1", createdAt: new Date("2026-01-01T00:00:00.000Z") };
      s.mentionTask.mockResolvedValue(task);
      const first = await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-2",
        id: "t1",
        body: "Here is my answer",
      });
      expect(first).toHaveProperty("comment");
      expect(s.priorReplies).toHaveBeenCalledWith({
        where: { ticketId: "t1", authorBotId: "bot-2", createdAt: { gte: task.createdAt } },
      });
      s.priorReplies.mockResolvedValue(1);
      const second = await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-2",
        id: "t1",
        body: "One more thing",
      });
      expect(second).toEqual({ error: expect.stringContaining("already replied") });
      expect(s.tx.ticketComment.create).toHaveBeenCalledTimes(1);
    });
    it("does not limit an ordinary run's comments", async () => {
      const s = mutationDeps();
      s.priorReplies.mockResolvedValue(3);
      const result = await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-1",
        id: "t1",
        body: "Progress",
      });
      expect(result).toHaveProperty("comment");
    });
    it("looks for a running mention task of the calling Nurling for this ticket only", async () => {
      const s = mutationDeps();
      await commentTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-2",
        id: "t1",
        body: "x",
      });
      expect(s.mentionTask).toHaveBeenCalledWith({
        where: {
          spaceId: "ws",
          botId: "bot-2",
          ticketId: "t1",
          ticketWake: { in: ["mention", "bot_mention"] },
          runs: { some: { status: { in: ["leased", "running"] } } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true, createdAt: true },
      });
    });
    it("refuses every ticket update in a mention run, whatever the field, and writes nothing", async () => {
      const s = mutationDeps();
      s.mentionTask.mockResolvedValue({ id: "task-1", createdAt: NOW });
      for (const patch of [
        { status: "done" },
        { status: "todo" },
        { ownerBotId: "bot-2" },
        { title: "Clearer title" },
        { description: "More detail" },
        { priority: "urgent" },
      ]) {
        const result = await updateTicket(s.deps, {
          spaceId: "ws",
          userId: "user-1",
          botId: "bot-2",
          id: "t1",
          ...patch,
        });
        expect(result).toEqual({
          error: expect.stringContaining("may only reply with one comment"),
        });
      }
      expect(s.prisma.$transaction).not.toHaveBeenCalled();
      expect(s.tx.ticket.update).not.toHaveBeenCalled();
      expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
      expect(s.changes).not.toHaveBeenCalled();
    });
    it("only refuses the ticket the mention run belongs to, and never an ordinary run", async () => {
      const s = mutationDeps();
      const task = { id: "task-1", createdAt: NOW };
      s.mentionTask.mockImplementation(async (query) =>
        (query as { where: { ticketId: string } }).where.ticketId === "t1" ? task : null,
      );
      const other = await updateTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-2",
        id: "t2",
        title: "Another ticket",
      });
      expect(other).toHaveProperty("ticket");
      s.mentionTask.mockResolvedValue(null);
      const ordinary = await updateTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-1",
        id: "t1",
        status: "doing",
        title: "Owner edit",
      });
      expect(ordinary).toHaveProperty("ticket");
    });
    it("never checks for a mention run when a user updates a ticket", async () => {
      const s = mutationDeps();
      await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", status: "doing" });
      expect(s.mentionTask).not.toHaveBeenCalled();
    });
  });
});

describe("replies on a ticket in review or blocked", () => {
  const reply = (body = "Change the title") => ({
    spaceId: "ws",
    userId: "user-1",
    id: "t1",
    body,
  });

  it.each(["review", "blocked"])(
    "moves a %s ticket to In progress and wakes the owner",
    async (status) => {
      const s = mutationDeps();
      s.setTicket({ status });
      await commentTicket(s.deps, reply());
      expect(s.tx.$queryRaw).toHaveBeenCalled();
      expect(s.current().status).toBe("doing");
      expect(s.tx.ticketEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          kind: "resumed",
          status: "doing",
          actorUserId: null,
          actorBotId: null,
        }),
      });
      expect(s.changes).toHaveBeenLastCalledWith(expect.objectContaining({ wakeAssignee: true }));
    },
  );

  it.each(["todo", "doing"])("leaves a %s ticket's status alone", async (status) => {
    const s = mutationDeps();
    s.setTicket({ status });
    await commentTicket(s.deps, reply());
    expect(s.current().status).toBe(status);
    expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
    expect(s.changes).toHaveBeenLastCalledWith(expect.objectContaining({ wakeAssignee: true }));
  });

  it("never moves a ticket for a Nurling's comment", async () => {
    const s = mutationDeps();
    s.setTicket({ status: "review" });
    await commentTicket(s.deps, { ...reply(), botId: "bot-1" });
    expect(s.current().status).toBe("review");
    expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
  });

  it("treats a comment that mentions only other Nurlings as addressed to them", async () => {
    const s = mutationDeps();
    s.setTicket({ status: "review" });
    await commentTicket(s.deps, {
      ...reply("@Scout thoughts?"),
      mentions: [{ kind: "bot", id: "bot-2" }],
    });
    expect(s.current().status).toBe("review");
    expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
    expect(s.changes).toHaveBeenLastCalledWith(
      expect.objectContaining({ wakeAssignee: false, mentionBotIds: ["bot-2"] }),
    );
  });

  it("keeps the owner out of a comment to others in any status", async () => {
    const s = mutationDeps();
    s.setTicket({ status: "doing" });
    await commentTicket(s.deps, { ...reply("@Scout"), mentions: [{ kind: "bot", id: "bot-2" }] });
    expect(s.changes).toHaveBeenLastCalledWith(expect.objectContaining({ wakeAssignee: false }));
  });

  it("counts a comment that mentions the owner among others as a reply", async () => {
    const s = mutationDeps();
    s.setTicket({ status: "review" });
    await commentTicket(s.deps, {
      ...reply("@Planner @Scout"),
      mentions: [
        { kind: "bot", id: "bot-2" },
        { kind: "bot", id: "bot-1" },
      ],
    });
    expect(s.current().status).toBe("doing");
    expect(s.changes).toHaveBeenLastCalledWith(expect.objectContaining({ wakeAssignee: true }));
  });

  it("counts a comment whose only mentions were dropped as a reply", async () => {
    const s = mutationDeps();
    s.setTicket({ status: "review" });
    await commentTicket(s.deps, { ...reply("@Ghost"), mentions: [{ kind: "bot", id: "foreign" }] });
    expect(s.current().status).toBe("doing");
  });
});

describe("needs you", () => {
  const nurling = { spaceId: "ws", userId: "user-1", botId: "bot-1", id: "t1" };

  it("is raised by a Nurling's comment that calls for the user and cleared by the next ones", async () => {
    const s = mutationDeps();
    s.setTicket({ status: "blocked" });
    await commentTicket(s.deps, { ...nurling, body: "Which region?", mentionUser: true });
    expect(s.current().needsUser).toBe(true);
    await commentTicket(s.deps, { ...nurling, body: "Still checking" });
    expect(s.current().needsUser).toBe(false);
    await commentTicket(s.deps, { ...nurling, body: "Which region?", mentionUser: true });
    await commentTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", body: "EU" });
    expect(s.current().needsUser).toBe(false);
  });

  it("is cleared when the user changes the status, and kept for other edits or a Nurling's move", async () => {
    const s = mutationDeps();
    s.setTicket({ needsUser: true, status: "blocked" });
    await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", title: "Renamed" });
    expect(s.current().needsUser).toBe(true);
    await updateTicket(s.deps, { ...nurling, status: "doing" });
    expect(s.current().needsUser).toBe(true);
    await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", status: "doing" });
    expect(s.current().needsUser).toBe(true);
    await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", status: "todo" });
    expect(s.current().needsUser).toBe(false);
  });

  it("is reported only while the ticket is open", async () => {
    const s = mutationDeps();
    s.setTicket({ needsUser: true, status: "blocked" });
    const open = await getTicket(s.deps, { spaceId: "ws", ref: "RAK-1" });
    expect(open).toHaveProperty("ticket.needsUser", true);
    for (const status of ["done", "closed"]) {
      s.setTicket({ status });
      const finished = await getTicket(s.deps, { spaceId: "ws", ref: "RAK-1" });
      expect(finished).toHaveProperty("ticket.needsUser", false);
    }
  });
});

describe("comment attachments", () => {
  const file = {
    kind: "file" as const,
    artifactId: "a1",
    name: "brief.pdf",
    mimeType: "application/pdf",
    size: 10,
  };

  it("stores a user's files and accepts a comment that is only files", async () => {
    const s = mutationDeps();
    const result = await commentTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      id: "t1",
      body: "",
      attachments: [file],
    });
    expect(result).toHaveProperty("comment.attachments", [file]);
    expect(s.tx.ticketComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ body: "", attachments: [file] }) }),
    );
    // A files-only comment is a reply like any other.
    expect(s.changes).toHaveBeenLastCalledWith(expect.objectContaining({ wakeAssignee: true }));
  });

  it("refuses an empty comment without files", async () => {
    const s = mutationDeps();
    await expect(
      commentTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", body: "  " }),
    ).resolves.toEqual({ error: "Invalid comment." });
    expect(s.tx.ticketComment.create).not.toHaveBeenCalled();
  });

  it("never stores files on a Nurling's comment", async () => {
    const s = mutationDeps();
    await commentTicket(s.deps, {
      spaceId: "ws",
      userId: "user-1",
      botId: "bot-1",
      id: "t1",
      body: "Here",
      attachments: [file],
    });
    expect(s.tx.ticketComment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attachments: [] }) }),
    );
  });
});

describe("ticket dates", () => {
  const user = { spaceId: "ws", userId: "user-1" };
  const wakes = (s: ReturnType<typeof mutationDeps>) =>
    s.changes.mock.calls.map(([value]) => (value as { wakeAssignee: boolean }).wakeAssignee);

  it("resolves dates in the user's timezone and schedules the first reminder", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-26T12:00:00Z"), toFake: ["Date"] });
    try {
      const s = mutationDeps();
      const result = await updateTicket(s.deps, {
        ...user,
        id: "t1",
        start: "2026-10-27",
        due: "2026-10-30T15:00",
      });
      expect(result).toEqual({
        ticket: expect.objectContaining({
          startAt: "2026-10-27T13:00:00.000Z",
          startHasTime: false,
          dueAt: "2026-10-30T19:00:00.000Z",
          dueHasTime: true,
        }),
      });
      expect(s.current()).toMatchObject({
        startWokenAt: null,
        dueWarnedAt: null,
        overdueNotifiedAt: null,
        scheduleAt: new Date("2026-10-27T13:00:00.000Z"),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("refuses a start after the due, counting the stored due", async () => {
    const s = mutationDeps();
    s.setTicket({ dueAt: new Date("2026-10-30T03:59:00Z") });
    expect(await updateTicket(s.deps, { ...user, id: "t1", start: "2026-11-02" })).toEqual({
      error: "Start must be before due.",
    });
    expect(
      await updateTicket(s.deps, { ...user, id: "t1", start: "2026-11-02", due: "2026-11-01" }),
    ).toEqual({ error: "Start must be before due." });
    expect(s.tx.ticket.update).not.toHaveBeenCalled();
  });

  it("explains a malformed date and clears a date with an empty string", async () => {
    const s = mutationDeps();
    expect(await updateTicket(s.deps, { ...user, id: "t1", due: "Friday" })).toEqual({
      error: "due: Use YYYY-MM-DD or YYYY-MM-DDTHH:mm",
    });
    s.setTicket({ dueAt: new Date("2030-01-01T04:59:00Z"), scheduleAt: new Date("2030-01-01") });
    await updateTicket(s.deps, { ...user, botId: "bot-1", id: "t1", due: "" });
    expect(s.current()).toMatchObject({ dueAt: null, scheduleAt: null });
  });

  it("does not wake the owner of a new ticket whose start is still to come", async () => {
    const s = mutationDeps();
    await createTicket(s.deps, {
      ...user,
      title: "Later",
      ownerBotId: "bot-2",
      start: "2099-01-05",
    });
    await createTicket(s.deps, { ...user, title: "Now", ownerBotId: "bot-2", start: "2020-01-05" });
    expect(wakes(s)).toEqual([false, true]);
  });

  it("holds a reassignment until the start, and wakes when a pending start is cleared", async () => {
    const s = mutationDeps();
    s.setTicket({ startAt: new Date("2099-01-05T14:00:00Z") });
    await updateTicket(s.deps, { ...user, id: "t1", ownerBotId: "bot-2" });
    await updateTicket(s.deps, { ...user, id: "t1", start: null });
    expect(wakes(s)).toEqual([false, true]);
  });

  it("wakes when a pending start moves to the past, but not in review or for the owner itself", async () => {
    const s = mutationDeps();
    s.setTicket({ startAt: new Date("2099-01-05T14:00:00Z") });
    await updateTicket(s.deps, { ...user, botId: "bot-1", id: "t1", start: "2020-01-01" });
    s.setTicket({
      startAt: new Date("2099-01-05T14:00:00Z"),
      startWokenAt: null,
      status: "review",
    });
    await updateTicket(s.deps, { ...user, id: "t1", start: "2020-01-01" });
    s.setTicket({ startAt: new Date("2099-01-05T14:00:00Z"), startWokenAt: null, status: "todo" });
    await updateTicket(s.deps, { ...user, id: "t1", start: "2020-01-01" });
    expect(wakes(s)).toEqual([false, false, true]);
  });
});
