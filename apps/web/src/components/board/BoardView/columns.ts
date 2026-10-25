import type { TicketListItem, TicketStatus } from "@rakazo/contracts";
import { TICKET_STATUSES } from "@rakazo/contracts";

/** Done shows a week of finished work; older tickets wait behind "Show N older". */
const RECENT_DONE_MS = 7 * 86_400_000;

export type BoardColumn = {
  status: TicketStatus;
  /** What the column shows before older Done tickets are revealed. */
  tickets: TicketListItem[];
  /** Done tickets completed more than a week ago. Empty for every other column. */
  older: TicketListItem[];
};

/** The six columns for the Nurling picked in the filter (`null` is everyone), in list order. */
export function boardColumns(
  tickets: readonly TicketListItem[],
  owner: string | null,
  now: Date,
): BoardColumn[] {
  const shown = owner ? tickets.filter((ticket) => ticket.assigneeBotId === owner) : tickets;
  const cutoff = now.getTime() - RECENT_DONE_MS;
  return TICKET_STATUSES.map((status) => {
    const all = shown.filter((ticket) => ticket.status === status);
    if (status !== "done") return { status, tickets: all, older: [] };
    const isOld = (ticket: TicketListItem) =>
      Boolean(ticket.completedAt && Date.parse(ticket.completedAt) < cutoff);
    return {
      status,
      tickets: all.filter((ticket) => !isOld(ticket)),
      older: all.filter(isOld),
    };
  });
}
