import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ensureBoard,
  listTicketComments,
  listTicketEvents,
  listTicketFiles,
  listTicketRuns,
  recordTicketEvents,
  toTicketCommentDto,
  toTicketEventDto,
} from "./board.js";
import type { PrismaClient } from "./client.js";
import { createDb } from "./client.js";
import { asSystem, runAsTenant } from "./row-security.js";

const databaseUrl = process.env.DATABASE_URL;
const describePostgres =
  process.env.VERIFY_DATABASE && databaseUrl ? describe.sequential : describe.skip;

describePostgres("board creation (PostgreSQL)", () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const organizationId = `board-organization-${suffix}`;
  const spaceId = `board-space-${suffix}`;
  const userId = `board-user-${suffix}`;
  const tenant = { spaceId, userId };
  let prisma: PrismaClient;
  let fixtures: PrismaClient;
  let close: () => Promise<void>;
  beforeAll(async () => {
    const db = createDb(databaseUrl!);
    prisma = db.prisma;
    fixtures = asSystem(prisma);
    close = async () => {
      await prisma.$disconnect();
      await db.pool.end();
    };
    await fixtures.user.create({
      data: {
        id: userId,
        name: "Board tester",
        email: `${userId}@example.test`,
      },
    });
    await fixtures.organization.create({
      data: {
        id: organizationId,
        name: "Board Org",
        slug: organizationId,
        createdAt: new Date(),
      },
    });
    await fixtures.space.create({
      data: { id: spaceId, organizationId, name: "General", isDefault: true },
    });
  });
  afterAll(async () => {
    if (!prisma) return;
    await fixtures.organization.deleteMany({ where: { id: organizationId } });
    await fixtures.user.delete({ where: { id: userId } });
    await close();
  });
  it("allows concurrent first opens and returns the same board", async () => {
    const boards = await Promise.all(
      Array.from({ length: 8 }, () => runAsTenant(tenant, () => ensureBoard(prisma, spaceId))),
    );
    expect(new Set(boards.map((board) => board.id)).size).toBe(1);
    expect(boards.every((board) => board.name === "General")).toBe(true);
    expect(boards.every((board) => board.ticketPrefix === "NUR")).toBe(true);
    expect(await fixtures.board.count({ where: { spaceId } })).toBe(1);
  });
  it("returns user and bot display names with comments", async () => {
    const board = await runAsTenant(tenant, () => ensureBoard(prisma, spaceId));
    const bot = await fixtures.bot.create({
      data: { spaceId, userId, name: "Planner", color: "blue" },
    });
    const ticket = await fixtures.ticket.create({
      data: { spaceId, boardId: board.id, number: 1, title: "Ship" },
    });
    await fixtures.ticketComment.createMany({
      data: [
        { ticketId: ticket.id, spaceId, authorUserId: userId, body: "Ready" },
        { ticketId: ticket.id, spaceId, authorBotId: bot.id, body: "Reviewed" },
      ],
    });
    const rows = await runAsTenant(tenant, () => listTicketComments(prisma, spaceId, ticket.id));
    const comments = rows.map(toTicketCommentDto);
    expect(comments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: "Ready", authorName: "Board tester" }),
        expect.objectContaining({ body: "Reviewed", authorName: "Planner" }),
      ]),
    );
  });

  it("keeps a ticket's events in order with who did what, inside the tenant", async () => {
    const board = await runAsTenant(tenant, () => ensureBoard(prisma, spaceId));
    const bot = await fixtures.bot.create({
      data: { spaceId, userId, name: "Chief", color: "blue" },
    });
    const ticket = await fixtures.ticket.create({
      data: { spaceId, boardId: board.id, number: 20, title: "Comps" },
    });
    await runAsTenant(tenant, () =>
      prisma.$transaction(async (tx) => {
        await recordTicketEvents(tx, {
          spaceId,
          ticketId: ticket.id,
          actor: { userId },
          events: [{ kind: "created", assigneeBotId: bot.id }],
        });
        await recordTicketEvents(tx, {
          spaceId,
          ticketId: ticket.id,
          actor: { botId: bot.id, userId },
          events: [{ kind: "status", status: "blocked" }],
        });
      }),
    );
    const rows = await runAsTenant(tenant, () => listTicketEvents(prisma, spaceId, ticket.id));
    expect(rows.map(toTicketEventDto)).toEqual([
      expect.objectContaining({
        kind: "created",
        actorName: "Board tester",
        assigneeName: "Chief",
        status: null,
      }),
      expect.objectContaining({ kind: "status", actorName: "Chief", status: "blocked" }),
    ]);
    const other = { spaceId: `${spaceId}-other`, userId };
    expect(
      await runAsTenant(other, () => listTicketEvents(prisma, other.spaceId, ticket.id)),
    ).toEqual([]);
  });

  it("lists only what a ticket's runs attached, newest version of each file", async () => {
    const board = await runAsTenant(tenant, () => ensureBoard(prisma, spaceId));
    const bot = await fixtures.bot.create({
      data: { spaceId, userId, name: "Scout", color: "green" },
    });
    const thread = await fixtures.thread.create({ data: { spaceId, botId: bot.id, userId } });
    const ticket = await fixtures.ticket.create({
      data: { spaceId, boardId: board.id, number: 21, title: "Report" },
    });
    const otherTicket = await fixtures.ticket.create({
      data: { spaceId, boardId: board.id, number: 22, title: "Other" },
    });
    const run = async (ticketId: string | null) => {
      const task = await fixtures.task.create({
        data: {
          spaceId,
          userId,
          botId: bot.id,
          threadId: thread.id,
          prompt: "work",
          status: "completed",
          ticketId,
        },
      });
      return fixtures.run.create({
        data: {
          spaceId,
          userId,
          botId: bot.id,
          threadId: thread.id,
          taskId: task.id,
          status: "completed",
          trigger: "tickets",
        },
      });
    };
    const mine = await run(ticket.id);
    const later = await run(ticket.id);
    const theirs = await run(otherTicket.id);
    const chat = await run(null);
    const file = (runId: string, name: string, version: number, rootArtifactId?: string) =>
      fixtures.artifact.create({
        data: {
          spaceId,
          userId,
          botId: bot.id,
          runId,
          name,
          mimeType: "text/csv",
          size: 1,
          hash: "h",
          storageKey: `${name}-${version}-${runId}`,
          version,
          rootArtifactId: rootArtifactId ?? null,
        },
      });
    const first = await file(mine.id, "comps.csv", 1);
    await file(later.id, "comps.csv", 2, first.id);
    await file(mine.id, "summary.md", 1);
    await file(theirs.id, "other.csv", 1);
    await file(chat.id, "chat.csv", 1);
    const files = await runAsTenant(tenant, () =>
      listTicketFiles(prisma, { spaceId, userId, ticketId: ticket.id }),
    );
    expect(files.map((item) => [item.name, item.version]).sort()).toEqual([
      ["comps.csv", 2],
      ["summary.md", 1],
    ]);
    expect(
      await runAsTenant(tenant, () =>
        listTicketFiles(prisma, { spaceId, userId: "someone-else", ticketId: ticket.id }),
      ),
    ).toEqual([]);
    // One row per Nurling, from the tenant's context: its latest run for this ticket only.
    expect(await runAsTenant(tenant, () => listTicketRuns(prisma, spaceId, ticket.id))).toEqual([
      expect.objectContaining({ botId: bot.id, status: "completed", finishedAt: null }),
    ]);
    expect(
      await runAsTenant({ spaceId: "someone-else", userId }, () =>
        listTicketRuns(prisma, spaceId, ticket.id),
      ),
    ).toEqual([]);
  });
});
