import type { Ticket, TicketComment, TicketEvent } from "@rakazo/contracts";

export type ActivityItem =
  | { kind: "event"; id: string; at: string; event: TicketEvent }
  | { kind: "comment"; id: string; at: string; comment: TicketComment };

/**
 * Status and owner changes and comments in one time-ordered list, newest last. A ticket made
 * before changes were recorded has no created event, so one is derived from the ticket itself.
 */
export function mergeActivity(
  ticket: Ticket,
  events: TicketEvent[],
  comments: TicketComment[],
): ActivityItem[] {
  const all = events.some((event) => event.kind === "created")
    ? events
    : [
        {
          id: `created-${ticket.id}`,
          ticketId: ticket.id,
          kind: "created" as const,
          actorBotId: ticket.createdByBotId,
          actorUserId: ticket.createdByBotId ? null : ticket.createdByUserId,
          actorName: null,
          status: null,
          assigneeBotId: ticket.assigneeBotId,
          assigneeName: null,
          createdAt: ticket.createdAt,
        },
        ...events,
      ];
  const items: ActivityItem[] = [
    ...all.map((event) => ({
      kind: "event" as const,
      id: event.id,
      at: event.createdAt,
      event,
    })),
    ...comments.map((comment) => ({
      kind: "comment" as const,
      id: comment.id,
      at: comment.createdAt,
      comment,
    })),
  ];
  return items.sort(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) ||
      (a.kind === b.kind ? 0 : a.kind === "event" ? -1 : 1) ||
      a.id.localeCompare(b.id),
  );
}
