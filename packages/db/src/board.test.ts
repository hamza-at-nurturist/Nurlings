import { describe, expect, it, vi } from "vitest";
import { ensureBoard } from "./board.js";
import type { PrismaClient } from "./client.js";

describe("ensureBoard", () => {
  it("creates a board with the brand ticket prefix", async () => {
    const row = { id: "board-1", spaceId: "space-1", name: "General", ticketPrefix: "NUR" };
    const createMany = vi.fn(async () => ({ count: 1 }));
    const prisma = {
      board: {
        findUnique: vi.fn(async () => null),
        createMany,
        findUniqueOrThrow: vi.fn(async () => row),
      },
      space: { findUnique: vi.fn(async () => ({ name: "General" })) },
    } as unknown as PrismaClient;

    await ensureBoard(prisma, "space-1");

    expect(createMany).toHaveBeenCalledWith({
      data: [{ spaceId: "space-1", name: "General", ticketPrefix: "NUR" }],
      skipDuplicates: true,
    });
  });
});
