import type {
  Artifact,
  Bot,
  Ticket,
  TicketComment,
  TicketEvent,
  TicketRun,
  TicketStatus,
} from "@rakazo/contracts";
import { needsTimeSeparator } from "../time-separators.js";

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

/** Who did something, as the reader should name them: you, a known name, or nobody. */
export type ActivityActor = { you: boolean; name: string | null };

/** What a feed line says, as data; each client turns it into its own words. */
export type ActivityLine =
  | { kind: "created"; actor: ActivityActor; owner: string | null }
  | { kind: "moved"; actor: ActivityActor; status: TicketStatus }
  | { kind: "assigned"; actor: ActivityActor; owner: string }
  | { kind: "approved"; actor: ActivityActor }
  | { kind: "resumed"; status: TicketStatus }
  | { kind: "attached"; actor: ActivityActor; name: string }
  | { kind: "failed"; name: string | null };

export type ActivityRow = {
  item: ActivityItem;
  /** Null for a comment, which renders as a card. */
  line: ActivityLine | null;
  /** A time separator opens this row. */
  separated: boolean;
};

/**
 * The rows a feed shows: comments, and every other item that has a line to say. Each row knows
 * whether chat's rule puts a time separator before it.
 */
export function activityRows(
  items: readonly ActivityItem[],
  context: { bots: readonly Pick<Bot, "id" | "name">[]; viewerId: string },
): ActivityRow[] {
  const botName = (id: string | null, fallback: string | null) =>
    (id ? context.bots.find((bot) => bot.id === id)?.name : undefined) ?? fallback;
  const eventActor = (event: TicketEvent): ActivityActor =>
    event.actorBotId
      ? { you: false, name: botName(event.actorBotId, event.actorName) }
      : event.actorUserId === context.viewerId
        ? { you: true, name: null }
        : { you: false, name: event.actorName };

  const lineFor = (item: ActivityItem): ActivityLine | null => {
    if (item.kind === "failed") return { kind: "failed", name: botName(item.botId, null) };
    if (item.kind === "file")
      return {
        kind: "attached",
        name: item.file.name,
        actor: item.file.runId
          ? { you: false, name: botName(item.file.botId, null) }
          : { you: true, name: null },
      };
    if (item.kind !== "event") return null;
    const { event } = item;
    const actor = eventActor(event);
    const owner = botName(event.assigneeBotId, event.assigneeName);
    if (event.kind === "created") return { kind: "created", actor, owner };
    if (event.kind === "status" && event.status)
      return { kind: "moved", actor, status: event.status };
    if (event.kind === "owner" && owner) return { kind: "assigned", actor, owner };
    if (event.kind === "approved") return { kind: "approved", actor };
    if (event.kind === "resumed" && event.status) return { kind: "resumed", status: event.status };
    return null;
  };

  const rows: ActivityRow[] = [];
  let previous: string | undefined;
  for (const item of items) {
    const line = lineFor(item);
    if (item.kind !== "comment" && line === null) continue;
    rows.push({ item, line, separated: needsTimeSeparator(item.at, previous) });
    previous = item.at;
  }
  return rows;
}
