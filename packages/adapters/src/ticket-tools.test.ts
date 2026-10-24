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
    it("refuses a status or owner change in a mention run, and writes nothing", async () => {
      const s = mutationDeps();
      s.mentionTask.mockResolvedValue({ id: "task-1", createdAt: NOW });
      for (const patch of [{ status: "done" }, { ownerBotId: "bot-2" }]) {
        const result = await updateTicket(s.deps, {
          spaceId: "ws",
          userId: "user-1",
          botId: "bot-2",
          id: "t1",
          ...patch,
        });
        expect(result).toEqual({ error: expect.stringContaining("only comment") });
      }
      expect(s.tx.ticket.update).not.toHaveBeenCalled();
      expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
      expect(s.changes).not.toHaveBeenCalled();
    });
    it("lets a mention run change other fields, set an unchanged status, and an ordinary run move the ticket", async () => {
      const s = mutationDeps();
      s.mentionTask.mockResolvedValue({ id: "task-1", createdAt: NOW });
      const title = await updateTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-2",
        id: "t1",
        title: "Clearer title",
      });
      expect(title).toHaveProperty("ticket");
      const same = await updateTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-2",
        id: "t1",
        status: "todo",
      });
      expect(same).toHaveProperty("ticket");
      s.mentionTask.mockResolvedValue(null);
      const moved = await updateTicket(s.deps, {
        spaceId: "ws",
        userId: "user-1",
        botId: "bot-1",
        id: "t1",
        status: "doing",
      });
      expect(moved).toHaveProperty("ticket");
    });
    it("never checks for a mention run when a user updates a ticket", async () => {
      const s = mutationDeps();
      await updateTicket(s.deps, { spaceId: "ws", userId: "user-1", id: "t1", status: "doing" });
      expect(s.mentionTask).not.toHaveBeenCalled();
    });
  });
});
