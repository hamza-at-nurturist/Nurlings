import { describe, expect, it, vi } from "vitest";
import { readTicketForRun, TICKET_IMAGE_LIMIT } from "./ticket-files.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const at = (minute: number) => new Date(NOW.getTime() + minute * 60_000);

type Row = { id: string; name: string; mimeType: string; size: number; runId: string | null };

function setup(rows: Row[], options: { artifacts?: boolean; failGet?: string } = {}) {
  const board = {
    id: "board-1",
    spaceId: "ws",
    name: "Personal",
    ticketPrefix: "RAK",
    nextNumber: 2,
    createdAt: NOW,
    updatedAt: NOW,
  };
  const ticket = {
    id: "t1",
    boardId: "board-1",
    spaceId: "ws",
    number: 1,
    title: "Photos of 12 Elm St",
    description: null,
    status: "doing",
    priority: null,
    assigneeBotId: "bot-1",
    createdByBotId: null,
    createdByUserId: "user-1",
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
    needsUser: false,
  };
  const artifacts = rows.map((row, index) => ({
    ...row,
    spaceId: "ws",
    userId: "user-1",
    botId: "bot-1",
    groupId: null,
    description: null,
    version: 1,
    rootArtifactId: null,
    hash: "h",
    storageKey: `key-${row.id}`,
    createdAt: at(index),
  }));
  const get = vi.fn(async (key: string) => {
    if (key === options.failGet) throw new Error("storage hiccup");
    return new Uint8Array([1, 2, 3]);
  });
  const prisma = {
    board: { findUnique: vi.fn(async () => board) },
    space: { findUnique: vi.fn(async () => ({ name: "Personal" })) },
    ticket: { findFirst: vi.fn(async () => ticket) },
    ticketComment: {
      findMany: vi.fn(async (args: { select?: unknown }) =>
        args.select
          ? [
              {
                attachments: artifacts
                  .filter((row) => !row.runId)
                  .map((row) => ({
                    kind: row.mimeType.startsWith("image/") ? "image" : "file",
                    artifactId: row.id,
                    name: row.name,
                    mimeType: row.mimeType,
                    size: row.size,
                  })),
              },
            ]
          : [],
      ),
    },
    run: { findMany: vi.fn(async () => [{ id: "run-1" }]) },
    artifact: {
      findMany: vi.fn(async (args: { where: { id?: { in: string[] } } }) =>
        args.where.id ? artifacts.filter((row) => args.where.id!.in.includes(row.id)) : artifacts,
      ),
    },
  };
  return {
    deps: {
      prisma,
      ticketBoardEnabled: true,
      ...(options.artifacts === false ? {} : { artifacts: { get } }),
    } as never,
    get,
  };
}

const context = {
  operationId: "op",
  traceId: "op",
  spaceId: "ws",
  userId: "user-1",
  botId: "bot-1",
  signal: new AbortController().signal,
};

const photo = (id: string, mimeType = "image/jpeg"): Row => ({
  id,
  name: `${id}.jpg`,
  mimeType,
  size: 3,
  runId: null,
});

describe("readTicketForRun", () => {
  it("lists the user's and the Nurling's files at chat attachment paths and queues them", async () => {
    const s = setup([
      { id: "a1", name: "brief.pdf", mimeType: "application/pdf", size: 3, runId: null },
      { id: "a2", name: "comps.csv", mimeType: "text/csv", size: 3, runId: "run-1" },
    ]);
    const read = await readTicketForRun(s.deps, { ref: "RAK-1", acceptsImages: true, context });
    expect(read.result).toMatchObject({
      ticket: { ref: "RAK-1" },
      files: [
        { name: "brief.pdf", path: "attachments/a1.pdf", addedBy: "user" },
        { name: "comps.csv", path: "attachments/a2.csv", addedBy: "nurling" },
      ],
    });
    expect(read.blocks.map((block) => block.artifactId)).toEqual(["a1", "a2"]);
    // No images, so the plain result: nothing is read from storage.
    expect(s.get).not.toHaveBeenCalled();
  });

  it("shows the newest photos to a model that can see, and keeps their bytes out of details", async () => {
    const s = setup(["p1", "p2", "p3", "p4", "p5"].map((id) => photo(id)));
    const read = await readTicketForRun(s.deps, { ref: "RAK-1", acceptsImages: true, context });
    const result = read.result as {
      kind: string;
      content: Array<{ type: string; mimeType?: string; data?: string }>;
      details: unknown;
    };
    expect(result.kind).toBe("agent_tool_result");
    expect(result.content[0]).toMatchObject({ type: "text" });
    const images = result.content.filter((part) => part.type === "image");
    expect(images).toHaveLength(TICKET_IMAGE_LIMIT);
    expect(images[0]).toEqual({ type: "image", mimeType: "image/jpeg", data: "AQID" });
    expect(s.get.mock.calls.map(([key]) => key)).toEqual(["key-p5", "key-p4", "key-p3", "key-p2"]);
    expect(JSON.stringify(result.details)).not.toContain("AQID");
    // Every photo is still listed and copied.
    expect(read.blocks).toHaveLength(5);
  });

  it("sends no image content to a model that cannot see", async () => {
    const s = setup([photo("p1")]);
    const read = await readTicketForRun(s.deps, { ref: "RAK-1", acceptsImages: false, context });
    expect(read.result).toMatchObject({ files: [{ name: "p1.jpg", addedBy: "user" }] });
    expect(read.result).not.toHaveProperty("kind");
    expect(s.get).not.toHaveBeenCalled();
  });

  it("lists WebP images without sending them, and skips an image it cannot load", async () => {
    const s = setup([photo("w1", "image/webp"), photo("p1"), photo("p2")], { failGet: "key-p2" });
    const read = await readTicketForRun(s.deps, { ref: "RAK-1", acceptsImages: true, context });
    const result = read.result as { content: Array<{ type: string }> };
    expect(result.content.filter((part) => part.type === "image")).toHaveLength(1);
    expect(s.get.mock.calls.map(([key]) => key)).toEqual(["key-p2", "key-p1"]);
    expect(read.blocks).toHaveLength(3);
  });

  it("leaves out a file over the attachment limit", async () => {
    const s = setup([{ ...photo("big"), size: 10 }, photo("p1")]);
    const read = await readTicketForRun({ ...(s.deps as object), maxUploadSizeBytes: 5 } as never, {
      ref: "RAK-1",
      acceptsImages: false,
      context,
    });
    expect(read.blocks.map((block) => block.artifactId)).toEqual(["p1"]);
  });

  it("returns the ticket alone when there is no artifact store, and errors as they are", async () => {
    const s = setup([photo("p1")], { artifacts: false });
    const read = await readTicketForRun(s.deps, { ref: "RAK-1", acceptsImages: true, context });
    expect(read).toEqual({
      result: expect.objectContaining({ ticket: expect.anything() }),
      blocks: [],
    });
    const missing = await readTicketForRun(s.deps, { ref: "", acceptsImages: true, context });
    expect(missing).toEqual({ result: { error: "ref is required." }, blocks: [] });
  });
});
