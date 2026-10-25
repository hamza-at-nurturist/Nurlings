import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commentTicket, updateTicket } from "@rakazo/adapters";
import { runAsSystem, runAsTenant } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { sessionCookieHeader } from "../../../packages/testkit/src/index.js";
import { createApp } from "./app.js";

const describePostgres =
  process.env.VERIFY_DATABASE === "1" && process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip;

const ORIGIN = "http://127.0.0.1:5173";

describePostgres("ticket mentions (PostgreSQL)", () => {
  it("wakes a mentioned non-owner for the ticket only, and keeps it to one reply and no updates", async () => {
    vi.stubEnv("TICKET_BOARD_ENABLED", "true");
    const dataDir = await mkdtemp(join(tmpdir(), "rakazo-mention-test-"));
    const handles = await createApp({
      databaseUrl: process.env.DATABASE_URL!,
      dataDir,
      sandboxProvider: "fake",
      agentRuntime: "scripted",
      wakeupDriver: "memory",
      signupsEnabled: "true",
      webOrigin: ORIGIN,
      authUrl: ORIGIN,
    });
    try {
      const signup = await handles.app.request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: JSON.stringify({
          email: `mention-${Date.now()}@rakazo.test`,
          password: "test-password-123",
          name: "Mention tester",
        }),
      });
      expect(signup.status).toBeLessThan(400);
      const cookie = sessionCookieHeader(signup);
      const call = async <T>(procedure: string, json: unknown) => {
        const response = await handles.app.request(`/rpc/${procedure}`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie, origin: ORIGIN },
          body: JSON.stringify({ json }),
        });
        expect(response.status).toBe(200);
        return ((await response.json()) as { json: T }).json;
      };
      const bot = (name: string) =>
        call<{ id: string }>("bots/create", {
          name,
          title: "",
          description: "",
          instructions: "",
          notifyOnFinish: true,
        });
      const owner = await bot("Chief");
      const scout = await bot("Scout");
      const ticket = await call<{ id: string; spaceId: string }>("tickets/create", {
        title: "Comp report",
        assigneeBotId: owner.id,
      });
      const system = <T>(fn: () => Promise<T>) => runAsSystem("mention test fixture", fn);
      const wakes = () =>
        system(() =>
          handles.prisma.task.findMany({
            where: { ticketId: ticket.id },
            orderBy: { createdAt: "asc" },
            select: { id: true, botId: true, ticketWake: true, prompt: true, createdAt: true },
          }),
        );
      const before = await wakes();
      const initial = before.map((task) => task.id);
      await system(() =>
        handles.prisma.run.updateMany({
          where: { taskId: { in: initial } },
          data: { status: "completed" },
        }),
      );

      // A user's comment mentioning only Scout wakes Scout; it is not a reply to the owner.
      const comment = await call<{ id: string; mentions: unknown }>("tickets/comment", {
        ticketId: ticket.id,
        body: "@Scout can you check these?",
        mentions: [
          { kind: "bot", id: scout.id },
          { kind: "bot", id: "not-a-bot" },
        ],
      });
      expect(comment.mentions).toEqual([{ kind: "bot", id: scout.id }]);
      const listed = await call<Array<{ id: string; mentions: unknown }>>("tickets/comments", {
        ticketId: ticket.id,
      });
      expect(listed.find((row) => row.id === comment.id)?.mentions).toEqual([
        { kind: "bot", id: scout.id },
      ]);
      const created = await wakes();
      const scoutTask = created.find((task) => task.botId === scout.id);
      expect(scoutTask).toMatchObject({ ticketWake: "mention" });
      expect(scoutTask?.prompt).toContain("not its owner");
      expect(
        created.filter((task) => task.botId === owner.id && task.ticketWake === null),
      ).toHaveLength(before.length);
      // Mentioning never changes the owner.
      expect(await call<{ assigneeBotId: string }>("tickets/get", { id: ticket.id })).toMatchObject(
        {
          assigneeBotId: owner.id,
        },
      );

      // While Scout's mention run is running, it may reply once and may not move the ticket.
      await system(() =>
        handles.prisma.run.updateMany({
          where: { taskId: scoutTask!.id },
          data: { status: "running" },
        }),
      );
      const tenant = {
        spaceId: ticket.spaceId,
        userId: (
          await system(() => handles.prisma.bot.findFirstOrThrow({ where: { id: scout.id } }))
        ).userId,
      };
      const deps = { prisma: handles.prisma, ticketBoardEnabled: true };
      const asScout = {
        spaceId: ticket.spaceId,
        userId: tenant.userId,
        botId: scout.id,
        id: ticket.id,
      };
      for (const patch of [
        { status: "done" },
        { title: "Renamed by a mention" },
        { priority: "urgent" },
      ]) {
        const refused = await runAsTenant(tenant, () =>
          updateTicket(deps, { ...asScout, ...patch }),
        );
        expect(refused).toEqual({
          error: expect.stringContaining("may only reply with one comment"),
        });
      }
      const reply = await runAsTenant(tenant, () =>
        commentTicket(deps, { ...asScout, body: "Looks fine to me" }),
      );
      expect(reply).toHaveProperty("comment");
      const second = await runAsTenant(tenant, () =>
        commentTicket(deps, { ...asScout, body: "And another thing" }),
      );
      expect(second).toEqual({ error: expect.stringContaining("already replied") });
      expect(
        await call<{ status: string; title: string; priority: string }>("tickets/get", {
          id: ticket.id,
        }),
      ).toMatchObject({ status: "todo", title: "Comp report", priority: "normal" });

      // Once the run is over, the Nurling is an ordinary commenter again.
      await system(() =>
        handles.prisma.run.updateMany({
          where: { taskId: scoutTask!.id },
          data: { status: "completed" },
        }),
      );
      const later = await runAsTenant(tenant, () =>
        commentTicket(deps, { ...asScout, body: "Back with a follow-up" }),
      );
      expect(later).toHaveProperty("comment");
    } finally {
      await handles.stop();
      await rm(dataDir, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });
});
