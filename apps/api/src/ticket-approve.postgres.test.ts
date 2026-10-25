import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commentTicket } from "@rakazo/adapters";
import { runAsSystem, runAsTenant } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { sessionCookieHeader } from "../../../packages/testkit/src/index.js";
import { createApp } from "./app.js";

const describePostgres =
  process.env.VERIFY_DATABASE === "1" && process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip;

const ORIGIN = "http://127.0.0.1:5173";

describePostgres("ticket approval and replies (PostgreSQL)", () => {
  it("sends a reviewed ticket back on a reply, approves it, and tracks Needs you", async () => {
    vi.stubEnv("TICKET_BOARD_ENABLED", "true");
    const dataDir = await mkdtemp(join(tmpdir(), "rakazo-approve-test-"));
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
          email: `approve-${Date.now()}@rakazo.test`,
          password: "test-password-123",
          name: "Approve tester",
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
      const bot = (name: string) =>
        call<{ id: string }>("bots/create", {
          name,
          title: "",
          description: "",
          instructions: "",
          notifyOnFinish: false,
        });
      const owner = await bot("Chief");
      const scout = await bot("Scout");
      type Ticket = { id: string; spaceId: string; status: string; needsUser: boolean };
      const ticket = await call<Ticket>("tickets/create", {
        title: "Comp report",
        assigneeBotId: owner.id,
      });
      const get = () => call<Ticket>("tickets/get", { id: ticket.id });
      const system = <T>(fn: () => Promise<T>) => runAsSystem("approve test fixture", fn);
      const ownerWakes = () =>
        system(() =>
          handles.prisma.task.count({
            where: { ticketId: ticket.id, botId: owner.id, ticketWake: null },
          }),
        );
      const settle = () =>
        system(() =>
          handles.prisma.run.updateMany({
            where: { task: { ticketId: ticket.id } },
            data: { status: "completed" },
          }),
        );
      const events = () =>
        call<Array<{ kind: string; status: string | null }>>("tickets/events", {
          ticketId: ticket.id,
        });
      await settle();

      // Approving is refused unless the ticket is in review.
      expect((await request("tickets/approve", { id: ticket.id })).status).toBe(400);

      // A reply to a ticket in review sends it back to work and wakes the owner.
      await call("tickets/move", { id: ticket.id, status: "review" });
      let wakes = await ownerWakes();
      await call("tickets/comment", { ticketId: ticket.id, body: "Add last quarter too" });
      expect(await get()).toMatchObject({ status: "doing" });
      expect(await ownerWakes()).toBe(wakes + 1);
      expect((await events()).at(-1)).toMatchObject({ kind: "status", status: "doing" });
      await settle();

      // A comment to another Nurling only is not a reply: no move, no owner wake.
      await call("tickets/move", { id: ticket.id, status: "review" });
      wakes = await ownerWakes();
      await call("tickets/comment", {
        ticketId: ticket.id,
        body: "@Scout does this look right?",
        mentions: [{ kind: "bot", id: scout.id }],
      });
      expect(await get()).toMatchObject({ status: "review" });
      expect(await ownerWakes()).toBe(wakes);
      await settle();

      // The owner calling for the user raises Needs you; the user's reply clears it.
      const tenant = {
        spaceId: ticket.spaceId,
        userId: (
          await system(() => handles.prisma.bot.findFirstOrThrow({ where: { id: owner.id } }))
        ).userId,
      };
      const deps = { prisma: handles.prisma, ticketBoardEnabled: true };
      await runAsTenant(tenant, () =>
        commentTicket(deps, {
          spaceId: ticket.spaceId,
          userId: tenant.userId,
          botId: owner.id,
          id: ticket.id,
          body: "Which quarter should I use?",
          mentionUser: true,
        }),
      );
      expect(await get()).toMatchObject({ status: "review", needsUser: true });
      const listed = await call<{ tickets: Ticket[] }>("tickets/list", {});
      expect(listed.tickets.find((row) => row.id === ticket.id)?.needsUser).toBe(true);
      await call("tickets/comment", { ticketId: ticket.id, body: "Q3" });
      expect(await get()).toMatchObject({ status: "doing", needsUser: false });
      await settle();

      // A status change by hand clears it too.
      await runAsTenant(tenant, () =>
        commentTicket(deps, {
          spaceId: ticket.spaceId,
          userId: tenant.userId,
          botId: owner.id,
          id: ticket.id,
          body: "Need your login",
          mentionUser: true,
        }),
      );
      expect(await get()).toMatchObject({ needsUser: true });
      await call("tickets/move", { id: ticket.id, status: "review" });
      expect(await get()).toMatchObject({ status: "review", needsUser: false });

      // Approve moves it to Done and records the approval; a second approve is refused.
      wakes = await ownerWakes();
      expect(await call<Ticket>("tickets/approve", { id: ticket.id })).toMatchObject({
        status: "done",
      });
      expect((await events()).at(-1)).toMatchObject({ kind: "approved", status: "done" });
      expect(await ownerWakes()).toBe(wakes);
      expect((await request("tickets/approve", { id: ticket.id })).status).toBe(400);
    } finally {
      await handles.stop();
      await rm(dataDir, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });
});
