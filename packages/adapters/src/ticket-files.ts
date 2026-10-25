import type { AdapterContext, AgentToolExecutionResult, ArtifactStore } from "@rakazo/adapter-kit";
import type { MessageBlock } from "@rakazo/contracts";
import { ATTACHMENT_MAX_BYTES } from "@rakazo/contracts";
import { messageBlockForArtifact } from "@rakazo/core";
import type { PrismaClient } from "@rakazo/db";
import { listTicketFiles } from "@rakazo/db";
import { getLogger } from "@rakazo/logging";
import { listCurrentTurnFiles } from "./thread-artifacts.js";
import { getTicket } from "./ticket-tools.js";

/** Newest ticket images a model sees per `ticket_get`; the rest stay listed and on the computer. */
export const TICKET_IMAGE_LIMIT = 4;
/** The image types a tool result can carry to the model. */
const TOOL_RESULT_IMAGE_TYPES = new Set(["image/png", "image/jpeg"]);

/**
 * `ticket_get` for a run: the ticket with its files at the same paths chat attachments use, the
 * blocks for the run to copy onto its computer through its chat attachment queue, and, for a model
 * that can see, the newest images as image content in the tool result, as screenshots are sent.
 */
export async function readTicketForRun(
  deps: {
    prisma: PrismaClient;
    artifacts?: ArtifactStore;
    ticketBoardEnabled?: boolean;
    maxUploadSizeBytes?: number;
  },
  input: { ref: string; acceptsImages: boolean; context: AdapterContext },
): Promise<{ result: unknown; blocks: Array<Extract<MessageBlock, { kind: "file" | "image" }>> }> {
  const read = await getTicket(deps, { spaceId: input.context.spaceId, ref: input.ref });
  if (!("ticket" in read) || !read.ticket || !deps.artifacts) return { result: read, blocks: [] };
  const limit = deps.maxUploadSizeBytes ?? ATTACHMENT_MAX_BYTES;
  const files = (
    await listTicketFiles(deps.prisma, {
      spaceId: input.context.spaceId,
      userId: input.context.userId,
      ticketId: read.ticket.id,
    })
  ).filter((file) => file.size <= limit);
  if (files.length === 0) return { result: { ...read, files: [] }, blocks: [] };
  const blocks = files.map((file) => messageBlockForArtifact(file));
  const listed = await listCurrentTurnFiles(deps, blocks, input.context);
  const payload = {
    ...read,
    files: listed.map((file, index) => ({
      ...file,
      addedBy: files[index]?.runId ? "nurling" : "user",
    })),
  };
  const images = input.acceptsImages ? await loadImages(deps, files, input.context) : [];
  if (images.length === 0) return { result: payload, blocks };
  const result: AgentToolExecutionResult = {
    kind: "agent_tool_result",
    content: [{ type: "text", text: JSON.stringify(payload) }, ...images],
    // Only this is stored as the call's result, so no image bytes are persisted.
    details: payload,
  };
  return { result, blocks };
}

async function loadImages(
  deps: { prisma: PrismaClient; artifacts?: ArtifactStore },
  files: Array<{ id: string; mimeType: string; createdAt: string }>,
  context: AdapterContext,
) {
  const newest = files
    .filter((file) => TOOL_RESULT_IMAGE_TYPES.has(file.mimeType))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, TICKET_IMAGE_LIMIT);
  if (newest.length === 0 || !deps.artifacts) return [];
  const rows = await deps.prisma.artifact.findMany({
    where: {
      id: { in: newest.map((file) => file.id) },
      spaceId: context.spaceId,
      userId: context.userId,
    },
    select: { id: true, storageKey: true },
  });
  const keys = new Map(rows.map((row) => [row.id, row.storageKey]));
  const images: Array<{ type: "image"; data: string; mimeType: "image/png" | "image/jpeg" }> = [];
  for (const file of newest) {
    const key = keys.get(file.id);
    if (!key) continue;
    try {
      const bytes = await deps.artifacts.get(key, context);
      images.push({
        type: "image",
        data: Buffer.from(bytes).toString("base64"),
        mimeType: file.mimeType as "image/png" | "image/jpeg",
      });
    } catch (error) {
      if (context.signal.aborted) throw error;
      // The file stays listed and copyable; only its preview for the model is missing.
      getLogger().warn("ticket image was not loaded for the model", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return images;
}
