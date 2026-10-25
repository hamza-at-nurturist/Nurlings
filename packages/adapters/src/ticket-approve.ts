import type { PrismaClient } from "@rakazo/db";
import { ensureBoard, recordTicketEvents, toTicketDto } from "@rakazo/db";
import type { TicketChangeNotifier } from "./ticket-changes.js";

export const APPROVE_NOT_IN_REVIEW_ERROR = "Only a ticket in review can be approved.";

/**
 * A user's approval of a ticket in review: it moves to Done. There is no Nurling tool for this,
 * and nothing is woken. The status is read under the row lock, so a stale button cannot close a
 * ticket that has just been sent back to work.
 */
export async function approveTicket(
  deps: {
    prisma: PrismaClient;
    ticketBoardEnabled?: boolean;
    onTicketChange?: TicketChangeNotifier;
  },
  input: { spaceId: string; userId: string; id: string },
) {
  if (!deps.ticketBoardEnabled) return { error: "Board unavailable." };
  const board = await ensureBoard(deps.prisma, input.spaceId);
  const result = await deps.prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM tickets WHERE id = ${input.id} AND "spaceId" = ${input.spaceId} FOR UPDATE`;
    const current = await tx.ticket.findFirst({
      where: { id: input.id, spaceId: input.spaceId, boardId: board.id },
    });
    // The refusal is returned as text so the transaction yields either a row or a reason.
    if (!current) return "Ticket not found.";
    if (current.status !== "review") return APPROVE_NOT_IN_REVIEW_ERROR;
    const row = await tx.ticket.update({
      where: { id: current.id },
      data: { status: "done", completedAt: current.completedAt ?? new Date(), needsUser: false },
    });
    await recordTicketEvents(tx, {
      spaceId: input.spaceId,
      ticketId: current.id,
      actor: { userId: input.userId },
      events: [{ kind: "approved", status: "done" }],
    });
    return row;
  });
  if (typeof result === "string") return { error: result };
  await deps.onTicketChange?.({
    spaceId: input.spaceId,
    boardId: board.id,
    ticketId: result.id,
    assigneeBotId: result.assigneeBotId,
    wakeAssignee: false,
  });
  return { ticket: toTicketDto(result, board.ticketPrefix) };
}
