import { brand } from "@nurlings/brand";
import type {
  Artifact,
  Board,
  Ticket,
  TicketComment,
  TicketEvent,
  TicketEventKind,
  TicketMention,
  TicketPriority,
  TicketStatus,
} from "@rakazo/contracts";
import {
  isTicketCompletedStatus,
  parseTicketRef,
  TicketEventKindSchema,
  TicketMentionSchema,
  TicketPrioritySchema,
  TicketStatusSchema,
  ticketRef,
} from "@rakazo/contracts";
import type {
  Board as BoardRow,
  Prisma,
  PrismaClient,
  TicketComment as TicketCommentRow,
  TicketEvent as TicketEventRow,
  Ticket as TicketRow,
} from "./client.js";

/** skipDuplicates tolerates concurrent first opens without aborting their transactions. */
export async function ensureBoard(prisma: PrismaClient, spaceId: string): Promise<BoardRow> {
  const existing = await prisma.board.findUnique({ where: { spaceId } });
  if (existing) return existing;
  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    select: { name: true },
  });
  const name = space?.name.trim() || "Board";
  await prisma.board.createMany({
    data: [{ spaceId, name, ticketPrefix: brand.ticketPrefix }],
    skipDuplicates: true,
  });
  return prisma.board.findUniqueOrThrow({ where: { spaceId } });
}

export async function listBoards(prisma: PrismaClient, spaceId: string): Promise<BoardRow[]> {
  return prisma.board.findMany({
    where: { spaceId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/**
 * Atomically reserve the next ticket number for a board. The board's counter is
 * incremented in the same transaction as the insert, so concurrent creates get
 * distinct ascending numbers.
 */
export async function allocateTicketNumber(
  tx: Pick<Prisma.TransactionClient, "board">,
  boardId: string,
): Promise<number> {
  const incremented = await tx.board.update({
    where: { id: boardId },
    data: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });
  return incremented.nextNumber - 1;
}

export async function findTicket(
  prisma: PrismaClient,
  spaceId: string,
  board: { id: string; ticketPrefix: string },
  input: { id?: string; ref?: string },
): Promise<TicketRow | null> {
  if (input.id) {
    return prisma.ticket.findFirst({
      where: { id: input.id, spaceId, boardId: board.id },
    });
  }
  const parsed = input.ref ? parseTicketRef(input.ref, board.ticketPrefix) : null;
  if (!parsed) return null;
  return prisma.ticket.findFirst({
    where: { number: parsed.number, spaceId, boardId: board.id },
  });
}

export function toBoardDto(row: BoardRow): Board {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    ticketPrefix: row.ticketPrefix,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Unknown or legacy status strings fall back to `todo`, so an old row still renders. */
export function coerceTicketStatus(value: string): TicketStatus {
  const parsed = TicketStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "todo";
}

/** Legacy free-text priorities fall back to `normal` so old rows keep rendering. */
function coerceTicketPriority(value: string | null | undefined): TicketPriority {
  const parsed = TicketPrioritySchema.safeParse(typeof value === "string" ? value.trim() : value);
  return parsed.success ? parsed.data : "normal";
}

export function toTicketDto(row: TicketRow, ticketPrefix: string): Ticket {
  const status = coerceTicketStatus(row.status);
  return {
    id: row.id,
    boardId: row.boardId,
    spaceId: row.spaceId,
    number: row.number,
    ref: ticketRef(ticketPrefix, row.number),
    title: row.title,
    description: row.description,
    status,
    priority: coerceTicketPriority(row.priority),
    assigneeBotId: row.assigneeBotId,
    createdByBotId: row.createdByBotId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    needsUser: row.needsUser && !isTicketCompletedStatus(status),
  };
}

export async function listTicketComments(
  prisma: Pick<PrismaClient, "ticketComment">,
  spaceId: string,
  ticketId: string,
) {
  return prisma.ticketComment.findMany({
    where: { ticketId, spaceId },
    include: { authorBot: { select: { name: true } }, authorUser: { select: { name: true } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

/** A row written by hand or by a later release may hold anything; keep only well-formed mentions. */
export function parseTicketMentions(value: unknown): TicketMention[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => {
    const mention = TicketMentionSchema.safeParse(item);
    return mention.success ? [mention.data] : [];
  });
}

export function toTicketCommentDto(
  row: TicketCommentRow & {
    authorBot: { name: string } | null;
    authorUser: { name: string } | null;
  },
): TicketComment {
  return {
    id: row.id,
    ticketId: row.ticketId,
    body: row.body,
    authorBotId: row.authorBotId,
    authorUserId: row.authorUserId,
    authorName: row.authorBot?.name ?? row.authorUser?.name ?? null,
    mentions: parseTicketMentions(row.mentions),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** A Nurling's own action is attributed to it; anything else to the signed-in user. */
export function ticketActor(input: { botId?: string; userId?: string }) {
  return input.botId
    ? { actorBotId: input.botId, actorUserId: null }
    : { actorBotId: null, actorUserId: input.userId ?? null };
}

export async function recordTicketEvents(
  tx: Pick<Prisma.TransactionClient, "ticketEvent">,
  input: {
    spaceId: string;
    ticketId: string;
    actor: { botId?: string; userId?: string };
    events: Array<{ kind: TicketEventKind; status?: TicketStatus; assigneeBotId?: string | null }>;
  },
): Promise<void> {
  if (input.events.length === 0) return;
  const actor = ticketActor(input.actor);
  // One statement per event so each gets its own `createdAt`, which orders the feed.
  for (const event of input.events) {
    await tx.ticketEvent.create({
      data: {
        spaceId: input.spaceId,
        ticketId: input.ticketId,
        kind: event.kind,
        ...actor,
        status: event.status ?? null,
        assigneeBotId: event.assigneeBotId ?? null,
      },
    });
  }
}

type TicketEventWithNames = TicketEventRow & {
  actorBot: { name: string } | null;
  actorUser: { name: string } | null;
  assigneeBot: { name: string } | null;
};

export async function listTicketEvents(
  prisma: Pick<PrismaClient, "ticketEvent">,
  spaceId: string,
  ticketId: string,
): Promise<TicketEventWithNames[]> {
  return prisma.ticketEvent.findMany({
    where: { ticketId, spaceId },
    include: {
      actorBot: { select: { name: true } },
      actorUser: { select: { name: true } },
      assigneeBot: { select: { name: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export function toTicketEventDto(row: TicketEventWithNames): TicketEvent {
  const kind = TicketEventKindSchema.safeParse(row.kind);
  return {
    id: row.id,
    ticketId: row.ticketId,
    kind: kind.success ? kind.data : "status",
    actorBotId: row.actorBotId,
    actorUserId: row.actorUserId,
    actorName: row.actorBot?.name ?? row.actorUser?.name ?? null,
    status: row.status ? coerceTicketStatus(row.status) : null,
    assigneeBotId: row.assigneeBotId,
    assigneeName: row.assigneeBot?.name ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Files the ticket's owner attached while working on it: artifacts of runs whose task was
 * started for this ticket, newest version of each family. A file that was only written to a
 * workspace is not an artifact, so it is not listed.
 */
export async function listTicketFiles(
  prisma: Pick<PrismaClient, "run" | "artifact">,
  input: { spaceId: string; userId: string; ticketId: string },
): Promise<Artifact[]> {
  const runs = await prisma.run.findMany({
    where: { spaceId: input.spaceId, task: { ticketId: input.ticketId } },
    select: { id: true },
  });
  if (runs.length === 0) return [];
  const rows = await prisma.artifact.findMany({
    where: {
      spaceId: input.spaceId,
      userId: input.userId,
      runId: { in: runs.map((run) => run.id) },
    },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }, { id: "desc" }],
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const family = row.rootArtifactId ?? row.id;
    if (!latest.has(family)) latest.set(family, row);
  }
  return [...latest.values()]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
    .map((row) => ({
      id: row.id,
      botId: row.botId,
      groupId: row.groupId,
      runId: row.runId,
      name: row.name,
      description: row.description,
      mimeType: row.mimeType,
      size: row.size,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
    }));
}
