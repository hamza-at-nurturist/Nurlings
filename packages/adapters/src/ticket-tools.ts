import type { TicketAttachment, TicketMention, TicketStatus } from "@rakazo/contracts";
import {
  CommentTicketInput,
  CreateTicketInput,
  isTicketCompletedStatus,
  TicketStatusSchema,
  ticketRef,
  UpdateTicketInput,
} from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import {
  allocateTicketNumber,
  ensureBoard,
  findTicket,
  listTicketComments,
  recordTicketEvents,
  toTicketCommentDto,
  toTicketDto,
} from "@rakazo/db";
import type { TicketChangeNotifier } from "./ticket-changes.js";
import {
  isTicketDateOpen,
  isTicketStartPending,
  resolveTicketDateInput,
  ticketDateChanges,
  ticketDateOrderError,
} from "./ticket-dates.js";
import {
  activeMentionTask,
  MENTION_RUN_COMMENT_ERROR,
  MENTION_RUN_UPDATE_ERROR,
  resolveMentions,
} from "./ticket-mentions.js";
import { ticketTriagePrompt } from "./ticket-wake.js";

type TicketToolDeps = {
  prisma: PrismaClient;
  ticketBoardEnabled?: boolean;
  onTicketChange?: TicketChangeNotifier;
};
const STATUS_ERROR = `status must be one of ${TicketStatusSchema.options.join(", ")}.`;
function coerceInputStatus(value: string) {
  const parsed = TicketStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
/**
 * An assignee must be one of the acting user's own bots, as the HTTP API
 * requires through `repos.getBot`. Assigning wakes the bot, which runs as its
 * owner, so another member's bot in the same space is not a valid target.
 */
async function ownBotInSpace(
  deps: TicketToolDeps,
  input: { spaceId: string; userId: string },
  botId: string,
) {
  return Boolean(
    await deps.prisma.bot.findFirst({
      where: { id: botId, spaceId: input.spaceId, userId: input.userId, archivedAt: null },
      select: { id: true },
    }),
  );
}
/** The spawn key onboarding gives the user's first Nurling, Chief. */
const CHIEF_SPAWN_KEY = "onboarding:first";

/** The user's Chief in the space, which takes a user's tickets that name no owner. */
async function findChief(deps: TicketToolDeps, input: { spaceId: string; userId: string }) {
  const chief = await deps.prisma.bot.findFirst({
    where: {
      spaceId: input.spaceId,
      userId: input.userId,
      spawnKey: CHIEF_SPAWN_KEY,
      archivedAt: null,
    },
    select: { id: true },
  });
  return chief?.id;
}
const NO_DATES = {
  startAt: null,
  startHasTime: false,
  dueAt: null,
  dueHasTime: false,
  startWokenAt: null,
  dueWarnedAt: null,
  overdueNotifiedAt: null,
};
/** A Nurling clears a date with an empty string; clients send null. */
function clearableDates(input: { start?: unknown; due?: unknown }) {
  return {
    start: input.start === "" ? null : input.start,
    due: input.due === "" ? null : input.due,
  };
}
/** A bad date gets its own message, so a Nurling can correct it; anything else stays generic. */
function invalidTicketError(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const issue = error.issues.find(
    (item) => item.path.length === 0 || item.path[0] === "start" || item.path[0] === "due",
  );
  if (!issue) return "Invalid ticket.";
  return issue.path.length ? `${String(issue.path[0])}: ${issue.message}` : issue.message;
}
const LIST_TICKETS_LIMIT = 50;
const LIST_DESCRIPTION_CHARS = 200;

/**
 * The page key is the ticket's `createdAt` with `id` as the tiebreaker, because
 * both never change. A key on `updatedAt` would move a ticket that is edited
 * while a bot pages the board: the ticket would end up above the saved cursor
 * and no later page could return it. A stable key keeps the scan complete.
 */
function encodeTicketListCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`, "utf8").toString("base64url");
}

function decodeTicketListCursor(
  cursor: string,
): { createdAt: Date; id: string } | { error: string } {
  let raw: string;
  try {
    raw = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return { error: "cursor is invalid." };
  }
  const split = raw.indexOf("|");
  if (split <= 0) return { error: "cursor is invalid." };
  const createdAt = new Date(raw.slice(0, split));
  const id = raw.slice(split + 1);
  if (Number.isNaN(createdAt.getTime()) || !id) return { error: "cursor is invalid." };
  return { createdAt, id };
}

function truncateDescription(value: string | null | undefined) {
  if (!value || value.length <= LIST_DESCRIPTION_CHARS) return value;
  return `${value.slice(0, LIST_DESCRIPTION_CHARS - 1)}…`;
}

export async function listBoardTickets(
  deps: TicketToolDeps,
  input: {
    spaceId: string;
    status?: string;
    assigneeBotId?: string;
    cursor?: string;
  },
) {
  if (!deps.ticketBoardEnabled) return { error: "Board unavailable." };
  let status: TicketStatus | undefined;
  if (input.status !== undefined) {
    status = coerceInputStatus(input.status);
    if (!status) return { error: STATUS_ERROR };
  }
  const cursor = input.cursor?.trim();
  let pageCursor: { createdAt: Date; id: string } | undefined;
  if (cursor) {
    const decoded = decodeTicketListCursor(cursor);
    if ("error" in decoded) return decoded;
    pageCursor = decoded;
  }
  const board = await ensureBoard(deps.prisma, input.spaceId);
  const rows = await deps.prisma.ticket.findMany({
    where: {
      spaceId: input.spaceId,
      boardId: board.id,
      // Closed tickets are history; they only show up when asked for by status.
      ...(status ? { status } : { status: { not: "closed" } }),
      ...(input.assigneeBotId ? { assigneeBotId: input.assigneeBotId } : {}),
      ...(pageCursor
        ? {
            OR: [
              { createdAt: { lt: pageCursor.createdAt } },
              { createdAt: pageCursor.createdAt, id: { lt: pageCursor.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: LIST_TICKETS_LIMIT + 1,
  });
  const page = rows.slice(0, LIST_TICKETS_LIMIT);
  const next = rows.length > LIST_TICKETS_LIMIT ? page.at(-1) : undefined;
  // A list is for scanning; ticket_get returns the full description.
  return {
    tickets: page.map((row) => {
      const dto = toTicketDto(row, board.ticketPrefix);
      return { ...dto, description: truncateDescription(dto.description) };
    }),
    ...(next ? { nextCursor: encodeTicketListCursor(next) } : {}),
  };
}

export async function getTicket(deps: TicketToolDeps, input: { spaceId: string; ref: string }) {
  if (!deps.ticketBoardEnabled) return { error: "Board unavailable." };
  const ref = input.ref.trim();
  if (!ref) return { error: "ref is required." };
  const board = await ensureBoard(deps.prisma, input.spaceId);
  const row =
    (await findTicket(deps.prisma, input.spaceId, board, { ref })) ??
    (await findTicket(deps.prisma, input.spaceId, board, { id: ref }));
  if (!row) return { error: `Ticket ${ref} not found.` };
  const comments = await listTicketComments(deps.prisma, input.spaceId, row.id);
  return {
    ticket: toTicketDto(row, board.ticketPrefix),
    comments: comments.map(toTicketCommentDto),
  };
}

export async function createTicket(
  deps: TicketToolDeps,
  input: {
    spaceId: string;
    botId?: string;
    userId: string;
    title: string;
    description?: string;
    priority?: string;
    ownerBotId?: string;
    /** Local date or date-time in the user's timezone; see `TicketDateInputSchema`. */
    start?: unknown;
    due?: unknown;
  },
) {
  if (!deps.ticketBoardEnabled) return { error: "Board unavailable." };
  const parsed = CreateTicketInput.safeParse({
    ...input,
    ...clearableDates(input),
    assigneeBotId: input.ownerBotId ?? input.botId,
  });
  if (!parsed.success) return { error: invalidTicketError(parsed.error) };
  const data = parsed.data;
  // A user's ticket without an owner goes to Chief to hand on, or stays unowned without one.
  const triage = data.assigneeBotId === undefined;
  const assigneeBotId = data.assigneeBotId ?? (await findChief(deps, input));
  if (data.assigneeBotId && !(await ownBotInSpace(deps, input, data.assigneeBotId)))
    return { error: "Unknown bot." };
  const dates = await resolveTicketDateInput(deps.prisma, input.userId, data);
  const orderError = ticketDateOrderError(dates, NO_DATES);
  if (orderError) return { error: orderError };
  const now = new Date();
  const dated = ticketDateChanges(NO_DATES, dates, now).data;
  const board = await ensureBoard(deps.prisma, input.spaceId);
  const row = await deps.prisma.$transaction(async (tx) => {
    const number = await allocateTicketNumber(tx, board.id);
    const created = await tx.ticket.create({
      data: {
        boardId: board.id,
        spaceId: input.spaceId,
        number,
        title: data.title,
        description: data.description ?? null,
        priority: data.priority,
        assigneeBotId: assigneeBotId ?? null,
        createdByBotId: input.botId ?? null,
        createdByUserId: input.userId,
        ...dated,
      },
    });
    await recordTicketEvents(tx, {
      spaceId: input.spaceId,
      ticketId: created.id,
      actor: input,
      events: [{ kind: "created", assigneeBotId: created.assigneeBotId }],
    });
    return created;
  });
  await deps.onTicketChange?.({
    spaceId: input.spaceId,
    boardId: board.id,
    ticketId: row.id,
    assigneeBotId: row.assigneeBotId,
    // A start still to come wakes the owner then, not now.
    wakeAssignee: row.assigneeBotId !== input.botId && !isTicketStartPending(row, now),
    ...(triage
      ? { wakePrompt: ticketTriagePrompt(ticketRef(board.ticketPrefix, row.number)) }
      : {}),
  });
  return { ticket: toTicketDto(row, board.ticketPrefix) };
}

export async function updateTicket(
  deps: TicketToolDeps,
  input: {
    spaceId: string;
    botId?: string;
    userId: string;
    id: string;
    title?: string;
    description?: string | null;
    priority?: string | null;
    status?: string;
    ownerBotId?: string;
    /** Null clears; omitted leaves the date as it is. */
    start?: unknown;
    due?: unknown;
  },
) {
  if (!deps.ticketBoardEnabled) return { error: "Board unavailable." };
  const parsed = UpdateTicketInput.safeParse({
    ...input,
    ...clearableDates(input),
    assigneeBotId: input.ownerBotId,
  });
  if (!parsed.success) return { error: invalidTicketError(parsed.error) };
  const data = parsed.data;
  if (data.assigneeBotId && !(await ownBotInSpace(deps, input, data.assigneeBotId)))
    return { error: "Unknown bot." };
  // A Nurling woken by a mention gets one comment and nothing else: no update of any field.
  if (
    input.botId &&
    (await activeMentionTask(deps.prisma, {
      spaceId: input.spaceId,
      botId: input.botId,
      ticketId: data.id,
    }))
  )
    return { error: MENTION_RUN_UPDATE_ERROR };
  const dates = await resolveTicketDateInput(deps.prisma, input.userId, data);
  const board = await ensureBoard(deps.prisma, input.spaceId);
  const result = await deps.prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${data.id} AND "spaceId" = ${input.spaceId} FOR UPDATE`;
    const current = await tx.ticket.findFirst({
      where: { id: data.id, spaceId: input.spaceId, boardId: board.id },
    });
    if (!current) return null;
    const orderError = ticketDateOrderError(dates, current);
    if (orderError) return orderError;
    const now = new Date();
    const dated = ticketDateChanges(current, dates, now);
    const statusChanged = data.status !== undefined && data.status !== current.status;
    const row = await tx.ticket.update({
      where: { id: current.id },
      data: {
        // A user who moves the ticket has acted on it, so it no longer waits on them.
        ...(statusChanged && !input.botId ? { needsUser: false } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.priority !== undefined ? { priority: data.priority ?? "normal" } : {}),
        ...(data.assigneeBotId !== undefined ? { assigneeBotId: data.assigneeBotId } : {}),
        ...(data.status !== undefined
          ? {
              status: data.status,
              completedAt: isTicketCompletedStatus(data.status)
                ? (current.completedAt ?? new Date())
                : null,
            }
          : {}),
        ...dated.data,
      },
    });
    const reassigned =
      data.assigneeBotId !== undefined && data.assigneeBotId !== current.assigneeBotId;
    await recordTicketEvents(tx, {
      spaceId: input.spaceId,
      ticketId: current.id,
      actor: input,
      events: [
        ...(statusChanged && data.status ? [{ kind: "status" as const, status: data.status }] : []),
        ...(reassigned
          ? [{ kind: "owner" as const, assigneeBotId: data.assigneeBotId ?? null }]
          : []),
      ],
    });
    // Assigning waits for a start still to come; ending that wait wakes the owner now.
    const wake =
      (reassigned && !isTicketStartPending(row, now)) ||
      (dated.startReleased && isTicketDateOpen(row.status));
    return { row, wake };
  });
  if (!result) return { error: "Ticket not found." };
  if (typeof result === "string") return { error: result };
  await deps.onTicketChange?.({
    spaceId: input.spaceId,
    boardId: board.id,
    ticketId: result.row.id,
    assigneeBotId: result.row.assigneeBotId,
    wakeAssignee: result.wake && result.row.assigneeBotId !== input.botId,
  });
  return { ticket: toTicketDto(result.row, board.ticketPrefix) };
}

export async function commentTicket(
  deps: TicketToolDeps,
  input: {
    spaceId: string;
    botId?: string;
    userId?: string;
    id: string;
    body: string;
    /** Mentions from a client, and from a Nurling's `mention_bots` / `mention_user`. */
    mentions?: TicketMention[];
    mentionBotIds?: string[];
    mentionUser?: boolean;
    /** The user's files, already checked by the caller against the ticket's owner. */
    attachments?: TicketAttachment[];
  },
) {
  if (!deps.ticketBoardEnabled) return { error: "Board unavailable." };
  const parsed = CommentTicketInput.safeParse({
    ticketId: input.id,
    body: input.body,
    artifactIds: input.attachments?.map((block) => block.artifactId),
  });
  if (!parsed.success) return { error: "Invalid comment." };
  const board = await ensureBoard(deps.prisma, input.spaceId);
  const ticket = await findTicket(deps.prisma, input.spaceId, board, { id: input.id });
  if (!ticket) return { error: "Ticket not found." };
  if (input.botId) {
    // A Nurling woken by a mention gets one reply on the ticket.
    const mention = await activeMentionTask(deps.prisma, {
      spaceId: input.spaceId,
      botId: input.botId,
      ticketId: ticket.id,
    });
    if (
      mention &&
      (await deps.prisma.ticketComment.count({
        where: {
          ticketId: ticket.id,
          authorBotId: input.botId,
          createdAt: { gte: mention.createdAt },
        },
      })) > 0
    )
      return { error: MENTION_RUN_COMMENT_ERROR };
  }
  const resolved = input.userId
    ? await resolveMentions(deps.prisma, { ...input, userId: input.userId })
    : { mentions: [], botIds: [] };
  // A user's comment that calls in only other Nurlings is addressed to them, not to the owner.
  const reply =
    !input.botId &&
    (resolved.botIds.length === 0 ||
      (ticket.assigneeBotId !== null && resolved.botIds.includes(ticket.assigneeBotId)));
  const row = await deps.prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${ticket.id} AND "spaceId" = ${input.spaceId} FOR UPDATE`;
    const current = await tx.ticket.findFirst({
      where: { id: ticket.id, spaceId: input.spaceId },
      select: { status: true },
    });
    // A reply to a ticket in review or blocked means there is more to do.
    const sendBack = reply && (current?.status === "review" || current?.status === "blocked");
    const comment = await tx.ticketComment.create({
      include: { authorBot: { select: { name: true } }, authorUser: { select: { name: true } } },
      data: {
        ticketId: ticket.id,
        spaceId: input.spaceId,
        authorBotId: input.botId ?? null,
        authorUserId: input.userId ?? null,
        body: parsed.data.body,
        mentions: resolved.mentions,
        attachments: input.botId ? [] : (input.attachments ?? []),
      },
    });
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        updatedAt: new Date(),
        needsUser: Boolean(input.botId) && resolved.mentions.some((item) => item.kind === "user"),
        ...(sendBack ? { status: "doing" } : {}),
      },
    });
    if (sendBack)
      await recordTicketEvents(tx, {
        spaceId: input.spaceId,
        ticketId: ticket.id,
        // Nobody moved it by hand, so the move has no actor.
        actor: {},
        events: [{ kind: "resumed", status: "doing" }],
      });
    return comment;
  });
  // A user's reply wakes the owner; a Nurling's never wakes anyone, so two Nurlings cannot loop.
  // The wake itself skips tickets that are done or closed.
  await deps.onTicketChange?.({
    spaceId: input.spaceId,
    boardId: board.id,
    ticketId: ticket.id,
    assigneeBotId: ticket.assigneeBotId,
    wakeAssignee: reply && Boolean(ticket.assigneeBotId),
    mentionBotIds: resolved.botIds,
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.botId ? { commentBotId: input.botId } : {}),
    ...(input.botId && resolved.mentions.some((item) => item.kind === "user")
      ? {
          mentionedUser: {
            ref: ticketRef(board.ticketPrefix, ticket.number),
            body: parsed.data.body,
          },
        }
      : {}),
  });
  return { comment: toTicketCommentDto(row) };
}
