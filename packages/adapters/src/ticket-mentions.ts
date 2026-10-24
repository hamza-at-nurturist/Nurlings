import type { JobPublisher } from "@rakazo/adapter-kit";
import { runContinueJob } from "@rakazo/adapter-kit";
import type { TicketMention } from "@rakazo/contracts";
import {
  isTicketCompletedStatus,
  TICKET_MENTIONS_MAX,
  TicketStatusSchema,
} from "@rakazo/contracts";
import { WORKING_RUN_STATUSES } from "@rakazo/core";
import type { PrismaClient } from "@rakazo/db";
import { getLogger } from "@rakazo/logging";
import { ticketWakePrompt } from "./ticket-wake.js";

/** Wakes started by a Nurling's mention, per ticket, per rolling window. */
export const BOT_MENTION_WAKE_CAP = 10;
export const BOT_MENTION_WAKE_WINDOW_MS = 60 * 60 * 1000;

/**
 * Why a task was started by a mention: `mention` (a user), `bot_mention` (a Nurling), or
 * `bot_mention_owner` (a Nurling woke the ticket's owner, which then works the ticket as usual).
 */
export type MentionWake = "mention" | "bot_mention" | "bot_mention_owner";
/** Runs that may only reply once; the owner's run is not one of them. */
const COMMENT_ONLY_WAKES: MentionWake[] = ["mention", "bot_mention"];
const BOT_STARTED_WAKES: MentionWake[] = ["bot_mention", "bot_mention_owner"];

export function mentionWakePrompt(ref: string): string {
  return `You were mentioned on ticket ${ref}. You are not its owner. Read it with ticket_get, then reply with exactly one ticket_comment. Do not change its status or owner.`;
}

/**
 * The ticket's mentions as stored, and the Nurlings to wake. A Nurling must belong to the same
 * user and space and not be archived, so a stale or forged id neither renders nor wakes. A user
 * mention is only possible from a Nurling, and always means that Nurling's own user.
 */
export async function resolveMentions(
  prisma: Pick<PrismaClient, "bot">,
  input: {
    spaceId: string;
    userId: string;
    botId?: string;
    mentions?: TicketMention[];
    mentionBotIds?: string[];
    mentionUser?: boolean;
  },
): Promise<{ mentions: TicketMention[]; botIds: string[] }> {
  const requested = [
    ...new Set([
      ...(input.mentions ?? []).filter((item) => item.kind === "bot").map((item) => item.id),
      ...(input.mentionBotIds ?? []),
    ]),
  ].slice(0, TICKET_MENTIONS_MAX);
  const valid = requested.length
    ? new Set(
        (
          await prisma.bot.findMany({
            where: {
              id: { in: requested },
              spaceId: input.spaceId,
              userId: input.userId,
              archivedAt: null,
            },
            select: { id: true },
          })
        ).map((bot) => bot.id),
      )
    : new Set<string>();
  const botIds = requested.filter((id) => valid.has(id));
  const mentionsUser =
    Boolean(input.botId) &&
    (input.mentionUser === true || (input.mentions ?? []).some((item) => item.kind === "user"));
  return {
    mentions: [
      ...botIds.map((id) => ({ kind: "bot" as const, id })),
      ...(mentionsUser ? [{ kind: "user" as const, id: input.userId }] : []),
    ],
    botIds,
  };
}

/**
 * The calling Nurling's task for this ticket that a mention started and is running now, or null.
 * A Nurling only calls tools inside a run, and a mentioned non-owner has no other run on the
 * ticket at the same time, so a hit means "this call comes from a mention wake".
 */
export async function activeMentionTask(
  prisma: Pick<PrismaClient, "task">,
  input: { spaceId: string; botId: string; ticketId: string },
): Promise<{ id: string; createdAt: Date } | null> {
  return prisma.task.findFirst({
    where: {
      spaceId: input.spaceId,
      botId: input.botId,
      ticketId: input.ticketId,
      ticketWake: { in: COMMENT_ONLY_WAKES },
      runs: { some: { status: { in: ["leased", "running"] } } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, createdAt: true },
  });
}

export const MENTION_RUN_STATUS_ERROR =
  "You were woken by a mention and may only comment. Do not change this ticket's status or owner.";
export const MENTION_RUN_COMMENT_ERROR =
  "You have already replied on this ticket. Stop here; do not post another comment.";

/**
 * Wake a mentioned Nurling for one ticket. Only the ticket's open state, the Nurling's validity
 * and (for a Nurling's mention) the loop guards decide; nothing here changes the ticket.
 */
export async function wakeMentionedBot(
  deps: { prisma: PrismaClient; jobs: JobPublisher; ticketBoardEnabled?: boolean },
  input: {
    spaceId: string;
    userId: string;
    ticketId: string;
    botId: string;
    /** The Nurling that made the mention; absent when a user did. */
    byBotId?: string;
  },
): Promise<void> {
  if (!deps.ticketBoardEnabled || input.botId === input.byBotId) return;
  const byBot = Boolean(input.byBotId);
  const run = await deps.prisma.$transaction(async (tx) => {
    // One mention at a time per ticket, so the cap and the working check cannot be raced past.
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${input.ticketId} AND "spaceId" = ${input.spaceId} FOR UPDATE`;
    const ticket = await tx.ticket.findFirst({
      where: { id: input.ticketId, spaceId: input.spaceId },
      include: { board: { select: { ticketPrefix: true } } },
    });
    if (!ticket) return null;
    const status = TicketStatusSchema.safeParse(ticket.status);
    if (!status.success || isTicketCompletedStatus(status.data)) return null;
    const isOwner = ticket.assigneeBotId === input.botId;
    // A user's comment already wakes the owner; asking again would only start a second run.
    if (isOwner && !byBot) return null;
    const bot = await tx.bot.findFirst({
      where: { id: input.botId, spaceId: input.spaceId, userId: input.userId, archivedAt: null },
      select: { id: true, userId: true, thread: { select: { id: true } } },
    });
    if (!bot?.thread) return null;
    const queued = await tx.run.findFirst({
      where: {
        spaceId: input.spaceId,
        botId: bot.id,
        trigger: "tickets",
        status: "queued",
        task: { ticketId: ticket.id },
      },
      select: { id: true },
    });
    if (queued) return null;
    if (byBot) {
      const working = await tx.run.findFirst({
        where: {
          spaceId: input.spaceId,
          botId: bot.id,
          status: { in: [...WORKING_RUN_STATUSES] },
          task: { ticketId: ticket.id },
        },
        select: { id: true },
      });
      if (working) return null;
      const recent = await tx.task.count({
        where: {
          spaceId: input.spaceId,
          ticketId: ticket.id,
          ticketWake: { in: BOT_STARTED_WAKES },
          createdAt: { gte: new Date(Date.now() - BOT_MENTION_WAKE_WINDOW_MS) },
        },
      });
      if (recent >= BOT_MENTION_WAKE_CAP) return null;
    }
    const wake: MentionWake = isOwner ? "bot_mention_owner" : byBot ? "bot_mention" : "mention";
    const ref = `${ticket.board.ticketPrefix}-${ticket.number}`;
    const task = await tx.task.create({
      data: {
        spaceId: input.spaceId,
        botId: bot.id,
        threadId: bot.thread.id,
        userId: bot.userId,
        ticketId: ticket.id,
        ticketWake: wake,
        prompt: isOwner ? ticketWakePrompt(ref) : mentionWakePrompt(ref),
        status: "queued",
      },
    });
    return tx.run.create({
      data: {
        spaceId: input.spaceId,
        botId: bot.id,
        threadId: bot.thread.id,
        userId: bot.userId,
        taskId: task.id,
        trigger: "tickets",
        status: "queued",
      },
    });
  });
  if (!run) return;
  await deps.jobs.enqueue(runContinueJob(run.id)).catch((error) => {
    getLogger().warn("ticket mention wake deferred to reconciliation", error);
  });
}
