import type { JobPublisher } from "@rakazo/adapter-kit";
import { runContinueJob } from "@rakazo/adapter-kit";
import { isTicketCompletedStatus, TicketStatusSchema } from "@rakazo/contracts";
import type { PrismaClient } from "@rakazo/db";
import { getLogger } from "@rakazo/logging";

/** What the owner is told when it is woken for a ticket. */
export function ticketWakePrompt(ref: string): string {
  return `Work on ticket ${ref}. Read it with ticket_get, including any comments added since you last looked, and answer them. Keep progress in ticket comments and update its status with ticket_update. Use ask or approval cards when user input is needed.`;
}

/**
 * Assignment and a user's comment wake only the current owner, without posting a chat message.
 * A wake that is still queued will read everything when it starts, so it absorbs a newer one.
 */
export async function wakeTicketAssignee(
  deps: { prisma: PrismaClient; jobs: JobPublisher; ticketBoardEnabled?: boolean },
  input: { spaceId: string; ticketId: string; botId: string },
): Promise<void> {
  if (!deps.ticketBoardEnabled) return;
  const run = await deps.prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findFirst({
      where: { id: input.ticketId, spaceId: input.spaceId, assigneeBotId: input.botId },
      include: { board: { select: { ticketPrefix: true } } },
    });
    if (!ticket) return null;
    const status = TicketStatusSchema.safeParse(ticket.status);
    if (!status.success || isTicketCompletedStatus(status.data)) return null;
    const queued = await tx.run.findFirst({
      where: {
        spaceId: input.spaceId,
        botId: input.botId,
        trigger: "tickets",
        status: "queued",
        task: { ticketId: ticket.id },
      },
      select: { id: true },
    });
    if (queued) return null;
    const bot = await tx.bot.findFirst({
      where: { id: input.botId, spaceId: input.spaceId, archivedAt: null },
      select: { id: true, userId: true, thread: { select: { id: true } } },
    });
    if (!bot?.thread) return null;
    const task = await tx.task.create({
      data: {
        spaceId: input.spaceId,
        botId: bot.id,
        threadId: bot.thread.id,
        userId: bot.userId,
        ticketId: ticket.id,
        prompt: ticketWakePrompt(`${ticket.board.ticketPrefix}-${ticket.number}`),
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
    getLogger().warn("ticket wake deferred to reconciliation", error);
  });
}
