import type { PrismaClient } from "@rakazo/db";
import { beforeEach, describe, expect, it, vi } from "vitest";

const wake = vi.hoisted(() => vi.fn(async (_deps: unknown, _input: Record<string, unknown>) => {}));
vi.mock("./ticket-mentions.js", () => ({ wakeMentionedBot: wake }));

import type { TicketChange } from "./ticket-changes.js";
import { createTicketChangeNotifier } from "./ticket-changes.js";

const base: TicketChange = {
  spaceId: "space-1",
  boardId: "board-1",
  ticketId: "ticket-1",
  assigneeBotId: "owner",
  wakeAssignee: false,
  userId: "user-1",
};

function setup(bot: unknown = { name: "Chief", notifyOnFinish: true, thread: { id: "thread-1" } }) {
  const send = vi.fn(async (_message: Record<string, unknown>, _context: unknown) => {});
  const findFirst = vi.fn(async () => bot);
  const notifier = createTicketChangeNotifier({
    ticketBoardEnabled: true,
    prisma: { bot: { findFirst } } as unknown as PrismaClient,
    jobs: {} as never,
    boardEvents: { notify: vi.fn(async () => {}) } as never,
    notifications: () => ({ send }) as never,
  });
  return { notifier, send, findFirst };
}

beforeEach(() => wake.mockClear());

describe("mentions on a ticket change", () => {
  it("wakes each mentioned Nurling for the commenting user, saying who asked", async () => {
    const s = setup();
    await s.notifier({ ...base, mentionBotIds: ["scout", "comms"], commentBotId: "owner" });
    expect(wake.mock.calls.map(([, input]) => input)).toEqual([
      {
        spaceId: "space-1",
        userId: "user-1",
        ticketId: "ticket-1",
        botId: "scout",
        byBotId: "owner",
      },
      {
        spaceId: "space-1",
        userId: "user-1",
        ticketId: "ticket-1",
        botId: "comms",
        byBotId: "owner",
      },
    ]);
  });

  it("leaves out the asker for a user's mention", async () => {
    const s = setup();
    await s.notifier({ ...base, mentionBotIds: ["scout"] });
    expect(wake.mock.calls[0]?.[1]).toEqual({
      spaceId: "space-1",
      userId: "user-1",
      ticketId: "ticket-1",
      botId: "scout",
    });
  });

  it("keeps going and does not fail the comment when one wake throws", async () => {
    wake.mockRejectedValueOnce(new Error("boom"));
    const s = setup();
    await expect(
      s.notifier({ ...base, mentionBotIds: ["scout", "comms"], commentBotId: "owner" }),
    ).resolves.toBeUndefined();
    expect(wake).toHaveBeenCalledTimes(2);
  });

  it("wakes nobody without mentions or without the commenting user", async () => {
    const s = setup();
    await s.notifier({ ...base });
    await s.notifier({ ...base, userId: undefined, mentionBotIds: ["scout"] });
    expect(wake).not.toHaveBeenCalled();
  });
});

describe("a Nurling mentioning the user", () => {
  const mentioned = {
    ...base,
    commentBotId: "chief",
    mentionedUser: { ref: "NUR-1", body: "I need you to sign in" },
  };

  it("sends a push naming the Nurling and the ticket, with the start of the comment", async () => {
    const s = setup();
    await s.notifier(mentioned);
    expect(s.findFirst).toHaveBeenCalledWith({
      where: { id: "chief", spaceId: "space-1", userId: "user-1" },
      select: { name: true, notifyOnFinish: true, thread: { select: { id: true } } },
    });
    expect(s.send).toHaveBeenCalledWith(
      {
        kind: "help",
        title: "Chief mentioned you on NUR-1",
        body: "I need you to sign in",
        botId: "chief",
        threadId: "thread-1",
        ticketId: "ticket-1",
      },
      expect.objectContaining({ spaceId: "space-1", userId: "user-1", botId: "chief" }),
    );
  });

  it("cuts a long comment to 140 characters", async () => {
    const s = setup();
    await s.notifier({ ...mentioned, mentionedUser: { ref: "NUR-1", body: "é".repeat(300) } });
    expect(String(s.send.mock.calls[0]?.[0].body)).toHaveLength(140);
  });

  it("sends nothing when the Nurling's notify-on-finish is off, it is unknown, or it has no thread", async () => {
    for (const bot of [
      { name: "Chief", notifyOnFinish: false, thread: { id: "t" } },
      null,
      { name: "Chief", notifyOnFinish: true, thread: null },
    ]) {
      const s = setup(bot);
      await s.notifier(mentioned);
      expect(s.send).not.toHaveBeenCalled();
    }
  });

  it("never fails the comment when the provider throws, and does nothing without a provider", async () => {
    const s = setup();
    s.send.mockRejectedValueOnce(new Error("push down"));
    await expect(s.notifier(mentioned)).resolves.toBeUndefined();
    const bare = createTicketChangeNotifier({
      ticketBoardEnabled: true,
      prisma: {} as unknown as PrismaClient,
      jobs: {} as never,
      boardEvents: { notify: vi.fn(async () => {}) } as never,
    });
    await expect(bare(mentioned)).resolves.toBeUndefined();
  });
});
