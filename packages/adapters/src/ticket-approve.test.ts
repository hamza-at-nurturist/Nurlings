import { describe, expect, it, vi } from "vitest";
import { APPROVE_NOT_IN_REVIEW_ERROR, approveTicket } from "./ticket-approve.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");

function setup(status: string | null, ticketBoardEnabled = true) {
  const board = {
    id: "board-1",
    spaceId: "ws",
    name: "Personal",
    ticketPrefix: "RAK",
    nextNumber: 2,
    createdAt: NOW,
    updatedAt: NOW,
  };
  let current =
    status === null
      ? null
      : {
          id: "t1",
          boardId: "board-1",
          spaceId: "ws",
          number: 1,
          title: "Ticket",
          description: null,
          status,
          priority: null,
          assigneeBotId: "bot-1",
          createdByBotId: null,
          createdByUserId: "user-1",
          createdAt: NOW,
          updatedAt: NOW,
          completedAt: null,
          needsUser: true,
        };
  const tx = {
    $queryRaw: vi.fn(async () => []),
    ticket: {
      findFirst: vi.fn(async () => current),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        current = { ...current!, ...data } as typeof current;
        return current;
      }),
    },
    ticketEvent: { create: vi.fn(async (_args: { data: Record<string, unknown> }) => ({})) },
  };
  const prisma = {
    board: { findUnique: vi.fn(async () => board) },
    space: { findUnique: vi.fn(async () => ({ name: "Personal" })) },
    $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const changes = vi.fn(async (_change: unknown) => {});
  return {
    deps: { prisma, ticketBoardEnabled, onTicketChange: changes } as never,
    prisma,
    tx,
    changes,
  };
}

const input = { spaceId: "ws", userId: "user-1", id: "t1" };

describe("approveTicket", () => {
  it("moves a ticket in review to Done, records the approval and wakes nobody", async () => {
    const s = setup("review");
    const result = await approveTicket(s.deps, input);
    expect(result).toEqual({
      ticket: expect.objectContaining({
        status: "done",
        needsUser: false,
        completedAt: expect.any(String),
      }),
    });
    expect(s.tx.$queryRaw).toHaveBeenCalled();
    expect(s.tx.ticket.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { status: "done", completedAt: expect.any(Date), needsUser: false },
    });
    expect(s.tx.ticketEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "approved",
        status: "done",
        actorUserId: "user-1",
        actorBotId: null,
      }),
    });
    expect(s.changes).toHaveBeenCalledWith(expect.objectContaining({ wakeAssignee: false }));
  });

  it.each(["todo", "doing", "blocked", "done", "closed"])(
    "refuses a %s ticket and writes nothing",
    async (status) => {
      const s = setup(status);
      await expect(approveTicket(s.deps, input)).resolves.toEqual({
        error: APPROVE_NOT_IN_REVIEW_ERROR,
      });
      expect(s.tx.ticket.update).not.toHaveBeenCalled();
      expect(s.tx.ticketEvent.create).not.toHaveBeenCalled();
      expect(s.changes).not.toHaveBeenCalled();
    },
  );

  it("refuses a second approval", async () => {
    const s = setup("review");
    await approveTicket(s.deps, input);
    await expect(approveTicket(s.deps, input)).resolves.toEqual({
      error: APPROVE_NOT_IN_REVIEW_ERROR,
    });
    expect(s.tx.ticketEvent.create).toHaveBeenCalledOnce();
  });

  it("reports a missing ticket", async () => {
    const s = setup(null);
    await expect(approveTicket(s.deps, input)).resolves.toEqual({ error: "Ticket not found." });
  });

  it("does nothing while the board is off", async () => {
    const s = setup("review", false);
    await expect(approveTicket(s.deps, input)).resolves.toEqual({ error: "Board unavailable." });
    expect(s.prisma.$transaction).not.toHaveBeenCalled();
  });
});
