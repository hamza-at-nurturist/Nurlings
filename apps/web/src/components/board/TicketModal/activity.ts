import type { Artifact, Ticket, TicketComment, TicketEvent, TicketRun } from "@rakazo/contracts";

export type ActivityItem =
  | { kind: "event"; id: string; at: string; event: TicketEvent }
  | { kind: "comment"; id: string; at: string; comment: TicketComment }
  | { kind: "file"; id: string; at: string; file: Artifact }
  | { kind: "failed"; id: string; at: string; botId: string };

const RANK = { event: 0, file: 1, comment: 2, failed: 3 } as const;

/**
 * Status and owner changes, files, comments and failed runs in one time-ordered list, newest last. A ticket made
 * before changes were recorded has no created event, so one is derived from the ticket itself.
 */
export function mergeActivity(
  ticket: Ticket,
  events: TicketEvent[],
  comments: TicketComment[],
  files: Artifact[] = [],
  runs: TicketRun[] = [],
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
    ...files.flatMap((file) =>
      file.botId
        ? [{ kind: "file" as const, id: `file-${file.id}`, at: file.createdAt, file }]
        : [],
    ),
    // A Nurling's latest run for the ticket, when it failed; a newer run replaces it.
    ...runs.flatMap((run) =>
      run.status === "failed" && run.finishedAt
        ? [
            {
              kind: "failed" as const,
              id: `failed-${run.botId}`,
              at: run.finishedAt,
              botId: run.botId,
            },
          ]
        : [],
    ),
  ];
  return items.sort(
    (a, b) =>
      Date.parse(a.at) - Date.parse(b.at) ||
      RANK[a.kind] - RANK[b.kind] ||
      a.id.localeCompare(b.id),
  );
}
