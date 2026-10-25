import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readTicketForRun } from "@rakazo/adapters";
import { runAsSystem, runAsTenant } from "@rakazo/db";
import { describe, expect, it, vi } from "vitest";
import { sessionCookieHeader } from "../../../packages/testkit/src/index.js";
import { createApp } from "./app.js";

const describePostgres =
  process.env.VERIFY_DATABASE === "1" && process.env.DATABASE_URL
    ? describe.sequential
    : describe.skip;

const ORIGIN = "http://127.0.0.1:5173";
// A 1x1 PNG.
const PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describePostgres("ticket uploads (PostgreSQL)", () => {
  it("attaches the user's files to a comment, lists them, and hands them to a ticket run", async () => {
    vi.stubEnv("TICKET_BOARD_ENABLED", "true");
    const dataDir = await mkdtemp(join(tmpdir(), "rakazo-upload-test-"));
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
          email: `upload-${Date.now()}@rakazo.test`,
          password: "test-password-123",
          name: "Upload tester",
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
      const other = await bot("Scout");
      const ticket = await call<{ id: string; spaceId: string; ref: string }>("tickets/create", {
        title: "Photos of 12 Elm St",
        assigneeBotId: owner.id,
      });
      const upload = (botId: string, name: string, mimeType: string, contentBase64: string) =>
        call<{ id: string }>("artifacts/create", { botId, name, mimeType, contentBase64 });
      const photo = await upload(owner.id, "front.png", "image/png", PNG);
      const notes = await upload(owner.id, "notes.txt", "text/plain", btoa("Roof replaced 2021"));

      // A file uploaded for another Nurling is refused, and nothing is stored.
      const foreign = await upload(other.id, "elsewhere.txt", "text/plain", btoa("x"));
      const refused = await request("tickets/comment", {
        ticketId: ticket.id,
        body: "",
        artifactIds: [foreign.id],
      });
      expect(refused.status).toBeGreaterThanOrEqual(400);

      // A files-only comment carries the blocks.
      const comment = await call<{ attachments: Array<{ kind: string; artifactId: string }> }>(
        "tickets/comment",
        { ticketId: ticket.id, body: "", artifactIds: [photo.id, notes.id] },
      );
      expect(comment.attachments).toEqual([
        expect.objectContaining({ kind: "image", artifactId: photo.id }),
        expect.objectContaining({ kind: "file", artifactId: notes.id }),
      ]);
      const comments = await call<Array<{ body: string; attachments: unknown[] }>>(
        "tickets/comments",
        { ticketId: ticket.id },
      );
      expect(comments.at(-1)?.attachments).toHaveLength(2);
      const files = await call<Array<{ id: string; runId: string | null }>>("tickets/files", {
        ticketId: ticket.id,
      });
      expect(files.map((file) => file.id).sort()).toEqual([photo.id, notes.id].sort());
      expect(files.every((file) => file.runId === null)).toBe(true);

      // The owner's run reads the ticket: both files listed, the photo shown to a seeing model.
      const userId = (
        await runAsSystem("upload test fixture", () =>
          handles.prisma.bot.findFirstOrThrow({ where: { id: owner.id } }),
        )
      ).userId;
      const context = {
        operationId: "upload-test",
        traceId: "upload-test",
        spaceId: ticket.spaceId,
        userId,
        botId: owner.id,
        signal: new AbortController().signal,
      };
      const artifacts = { get: vi.fn(async () => new Uint8Array([1, 2, 3])) };
      const read = await runAsTenant({ spaceId: ticket.spaceId, userId }, () =>
        readTicketForRun({ prisma: handles.prisma, ticketBoardEnabled: true, artifacts } as never, {
          ref: ticket.ref,
          acceptsImages: true,
          context,
        }),
      );
      const result = read.result as {
        content: Array<{ type: string }>;
        details: { files: Array<{ name: string; path: string; addedBy: string }> };
      };
      expect(result.details.files).toEqual([
        expect.objectContaining({
          name: "front.png",
          path: `attachments/${photo.id}.png`,
          addedBy: "user",
        }),
        expect.objectContaining({
          name: "notes.txt",
          path: `attachments/${notes.id}.txt`,
          addedBy: "user",
        }),
      ]);
      expect(result.content.filter((part) => part.type === "image")).toHaveLength(1);
      expect(read.blocks.map((block) => block.artifactId)).toEqual([photo.id, notes.id]);
    } finally {
      await handles.stop();
      await rm(dataDir, { recursive: true, force: true });
      vi.unstubAllEnvs();
    }
  });
});
