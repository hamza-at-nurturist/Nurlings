import type { PrismaClient } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import {
  BOT_MENTION_WAKE_CAP,
  BOT_MENTION_WAKE_WINDOW_MS,
  mentionWakePrompt,
  wakeMentionedBot,
} from "./ticket-mentions.js";

type Options = {
  status?: string;
  assigneeBotId?: string | null;
  queued?: boolean;
  working?: boolean;
  recent?: number;
  botFound?: boolean;
};

function setup(options: Options = {}) {
  const enqueue = vi.fn(async () => {});
  const createTask = vi.fn(async (_args: { data: Record<string, unknown> }) => ({ id: "task-1" }));
  const createRun = vi.fn(async (_args: { data: Record<string, unknown> }) => ({ id: "run-1" }));
  const runFindFirst = vi.fn(async ({ where }: { where: { status: unknown } }) => {
    if (where.status === "queued") return options.queued ? { id: "run-q" } : null;
    return options.working ? { id: "run-w" } : null;
  });
  const taskCount = vi.fn(async (_args: unknown) => options.recent ?? 0);
  const tx = {
    $queryRaw: vi.fn(async () => []),
    ticket: {
      findFirst: vi.fn(async () => ({
        id: "t1",
        status: options.status ?? "doing",
        number: 7,
        assigneeBotId: options.assigneeBotId === undefined ? "owner" : options.assigneeBotId,
        board: { ticketPrefix: "NUR" },
      })),
    },
    bot: {
      findFirst: vi.fn(async () =>
        options.botFound === false
          ? null
          : { id: "scout", userId: "user-1", thread: { id: "thread-1" } },
      ),
    },
    run: { findFirst: runFindFirst, create: createRun },
    task: { count: taskCount, create: createTask },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  } as unknown as PrismaClient;
  const deps = { prisma, jobs: { enqueue } as never, ticketBoardEnabled: true };
  const wake = (input: { botId?: string; byBotId?: string } = {}) =>
    wakeMentionedBot(deps, {
      spaceId: "ws",
      userId: "user-1",
      ticketId: "t1",
      botId: input.botId ?? "scout",
      ...(input.byBotId ? { byBotId: input.byBotId } : {}),
    });
  const transaction = prisma.$transaction as unknown as ReturnType<typeof vi.fn>;
  return {
    wake,
    tx,
    enqueue,
    createTask,
    createRun,
    taskCount,
    runFindFirst,
    deps,
    prismaTransactionCalled: () => transaction.mock.calls.length > 0,
  };
}

describe("wakeMentionedBot", () => {
  it("wakes a non-owner a user mentioned, for that ticket only, with the reply-once prompt", async () => {
    const s = setup();
    await s.wake();
    expect(s.createTask).toHaveBeenCalledWith({
      data: expect.objectContaining({
        botId: "scout",
        ticketId: "t1",
        ticketWake: "mention",
        prompt: mentionWakePrompt("NUR-7"),
      }),
    });
    expect(mentionWakePrompt("NUR-7")).toContain("not its owner");
    expect(mentionWakePrompt("NUR-7")).toContain("exactly one ticket_comment");
    expect(mentionWakePrompt("NUR-7")).toContain("Do not change its status or owner");
    expect(s.createRun).toHaveBeenCalledWith({
      data: expect.objectContaining({ trigger: "tickets", status: "queued" }),
    });
    expect(s.enqueue).toHaveBeenCalledOnce();
    expect(s.tx.$queryRaw).toHaveBeenCalledOnce();
  });

  it("does nothing when the board is off, for a finished ticket, or for an invalid Nurling", async () => {
    const off = setup();
    await wakeMentionedBot(
      { ...off.deps, ticketBoardEnabled: false },
      {
        spaceId: "ws",
        userId: "user-1",
        ticketId: "t1",
        botId: "scout",
      },
    );
    expect(off.createTask).not.toHaveBeenCalled();
    for (const status of ["done", "closed"]) {
      const s = setup({ status });
      await s.wake();
      expect(s.createTask).not.toHaveBeenCalled();
    }
    const missing = setup({ botFound: false });
    await missing.wake();
    expect(missing.tx.bot.findFirst).toHaveBeenCalledWith({
      where: { id: "scout", spaceId: "ws", userId: "user-1", archivedAt: null },
      select: { id: true, userId: true, thread: { select: { id: true } } },
    });
    expect(missing.createTask).not.toHaveBeenCalled();
  });

  it("does not start a second run while one is still queued", async () => {
    const s = setup({ queued: true });
    await s.wake();
    expect(s.createTask).not.toHaveBeenCalled();
    expect(s.enqueue).not.toHaveBeenCalled();
  });

  it("does not wake the owner for a user mention, because the comment already does", async () => {
    const s = setup({ assigneeBotId: "scout" });
    await s.wake();
    expect(s.createTask).not.toHaveBeenCalled();
  });

  it("never wakes the commenting Nurling itself", async () => {
    const s = setup();
    await s.wake({ byBotId: "scout" });
    expect(s.prismaTransactionCalled()).toBe(false);
  });

  describe("started by a Nurling", () => {
    it("wakes an idle Nurling and marks the task as a Nurling's mention", async () => {
      const s = setup();
      await s.wake({ byBotId: "owner" });
      expect(s.createTask).toHaveBeenCalledWith({
        data: expect.objectContaining({ ticketWake: "bot_mention" }),
      });
    });

    it("skips a Nurling that already works on this ticket", async () => {
      const s = setup({ working: true });
      await s.wake({ byBotId: "owner" });
      expect(s.runFindFirst).toHaveBeenCalledWith({
        where: {
          spaceId: "ws",
          botId: "scout",
          status: { in: ["queued", "leased", "running"] },
          task: { ticketId: "t1" },
        },
        select: { id: true },
      });
      expect(s.createTask).not.toHaveBeenCalled();
    });

    it("allows the tenth wake in the hour and refuses the eleventh", async () => {
      const allowed = setup({ recent: BOT_MENTION_WAKE_CAP - 1 });
      await allowed.wake({ byBotId: "owner" });
      expect(allowed.createTask).toHaveBeenCalledOnce();
      const refused = setup({ recent: BOT_MENTION_WAKE_CAP });
      await refused.wake({ byBotId: "owner" });
      expect(refused.createTask).not.toHaveBeenCalled();
      expect(refused.enqueue).not.toHaveBeenCalled();
    });

    it("counts only Nurling-started wakes of this ticket within the last hour", async () => {
      const s = setup();
      const before = Date.now();
      await s.wake({ byBotId: "owner" });
      const query = s.taskCount.mock.calls[0]?.[0] as {
        where: {
          spaceId: string;
          ticketId: string;
          ticketWake: { in: string[] };
          createdAt: { gte: Date };
        };
      };
      expect(query.where).toMatchObject({
        spaceId: "ws",
        ticketId: "t1",
        ticketWake: { in: ["bot_mention", "bot_mention_owner"] },
      });
      const since = query.where.createdAt.gte.getTime();
      expect(since).toBeGreaterThanOrEqual(before - BOT_MENTION_WAKE_WINDOW_MS - 1000);
      expect(since).toBeLessThanOrEqual(Date.now() - BOT_MENTION_WAKE_WINDOW_MS + 1000);
    });

    it("wakes the owner as a normal ticket run, not a comment-only one", async () => {
      const s = setup({ assigneeBotId: "scout" });
      await s.wake({ byBotId: "helper" });
      expect(s.createTask).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketWake: "bot_mention_owner",
          prompt: expect.stringContaining("Work on ticket NUR-7."),
        }),
      });
    });
  });

  describe("started by a user", () => {
    it("ignores the working check and the cap", async () => {
      const s = setup({ working: true, recent: 50 });
      await s.wake();
      expect(s.createTask).toHaveBeenCalledOnce();
      expect(s.taskCount).not.toHaveBeenCalled();
      expect(s.runFindFirst).toHaveBeenCalledTimes(1);
    });
  });
});
