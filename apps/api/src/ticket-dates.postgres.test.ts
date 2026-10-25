import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { enqueueDueTicketDates, runTicketDates } from "@rakazo/adapters";
import { runAsSystem, runAsTenant } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { sessionCookieHeader } from "../../../packages/testkit/src/index.js";
import { createApp } from "./app.js";

const describePostgres =
  process.env.VERIFY_DATABASE === "1" && process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip;

const ORIGIN = "http://127.0.0.1:5173";

describePostgres("ticket dates (PostgreSQL)", () => {
  it("defers the start wake, sends one heads-up and one overdue push, and ignores stale jobs", async () => {
    vi.stubEnv("TICKET_BOARD_ENABLED", "true");
    const dataDir = await mkdtemp(join(tmpdir(), "rakazo-dates-test-"));
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
          email: `dates-${Date.now()}@rakazo.test`,
          password: "test-password-123",
          name: "Dates tester",
        }),
      });
      expect(signup.status).toBeLessThan(400);
      const cookie = sessionCookieHeader(signup);
      const request = (procedure: string, json: unknown) =>
        handles.app.request(`/rpc/${procedure}`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie, origin: ORIGIN },
          body: JSON.stringify({ json }),
        });
      const call = async <T>(procedure: string, json: unknown) => {
        const response = await request(procedure, json);
        expect(response.status).toBe(200);
        return ((await response.json()) as { json: T }).json;
      };
      await call("preferences/update", { timezone: "America/New_York" });
      const owner = await call<{ id: string; userId: string }>("bots/create", {
        name: "Chief",
        title: "",
        description: "",
        instructions: "",
        notifyOnFinish: true,
      });
      type Ticket = { id: string; spaceId: string; ref: string; startAt: string | null };
      const system = <T>(fn: () => Promise<T>) => runAsSystem("dates test fixture", fn);
      const wakes = (ticketId: string) =>
        system(() =>
          handles.prisma.task.findMany({
            where: { ticketId, botId: owner.id },
            select: { prompt: true },
            orderBy: { createdAt: "asc" },
          }),
        );
      const settle = (ticketId: string) =>
        system(() =>
          handles.prisma.run.updateMany({
            where: { task: { ticketId } },
            data: { status: "completed" },
          }),
        );

      // A start still to come holds the assignment wake; the date resolves in the user's zone.
      const ticket = await call<Ticket>("tickets/create", {
        title: "Lease renewal",
        assigneeBotId: owner.id,
        start: "2099-01-05",
        due: "2099-01-06T15:00",
      });
      expect(ticket.startAt).toBe("2099-01-05T14:00:00.000Z");
      expect(await wakes(ticket.id)).toHaveLength(0);
      expect((await request("tickets/update", { id: ticket.id, start: "2099-01-07" })).status).toBe(
        400,
      );

      // Clearing the pending start wakes the owner now.
      await call("tickets/update", { id: ticket.id, start: null });
      expect(await wakes(ticket.id)).toHaveLength(1);
      await settle(ticket.id);

      const enqueue = vi.fn(async () => {});
      const send = vi.fn(async () => {});
      const deps = {
        prisma: handles.prisma,
        jobs: { enqueue } as never,
        ticketBoardEnabled: true,
        notifications: () => ({ describe: vi.fn(), send }) as never,
      };
      const tenant = {
        spaceId: ticket.spaceId,
        userId: (
          await system(() => handles.prisma.bot.findFirstOrThrow({ where: { id: owner.id } }))
        ).userId,
      };
      const runJob = () => runAsTenant(tenant, () => runTicketDates(deps, { ticketId: ticket.id }));
      const now = Date.now();

      // Bring the due within its heads-up window; the reconciler finds it and the job wakes once.
      await system(() =>
        handles.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            dueAt: new Date(now + 3_600_000),
            dueHasTime: true,
            dueWarnedAt: null,
            overdueNotifiedAt: null,
            scheduleAt: new Date(now - 7_200_000),
          },
        }),
      );
      await system(() => enqueueDueTicketDates(deps));
      expect(enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ticket.dates",
          payload: expect.objectContaining({ ticketId: ticket.id }),
        }),
      );
      await runJob();
      await runJob();
      const prompts = (await wakes(ticket.id)).map((row) => row.prompt);
      expect(prompts).toHaveLength(2);
      expect(prompts[1]).toContain(`Ticket ${ticket.ref} is due`);
      await settle(ticket.id);

      // A job left behind by a due moved later does nothing.
      await call("tickets/update", { id: ticket.id, due: "2099-02-01" });
      await runJob();
      expect(await wakes(ticket.id)).toHaveLength(2);

      // Once the due passes, the user is told once.
      await system(() =>
        handles.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            dueAt: new Date(now - 60_000),
            dueWarnedAt: new Date(now),
            overdueNotifiedAt: null,
            scheduleAt: new Date(now - 60_000),
          },
        }),
      );
      await runJob();
      await runJob();
      expect(send).toHaveBeenCalledOnce();
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ title: `${ticket.ref} is overdue`, body: "Lease renewal" }),
        expect.anything(),
      );
      expect(await wakes(ticket.id)).toHaveLength(2);
    } finally {
      await handles.stop();
      await rm(dataDir, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });
});
