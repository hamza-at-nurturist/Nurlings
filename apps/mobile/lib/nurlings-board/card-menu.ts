import { TICKET_STATUSES, type TicketStatus } from "@rakazo/contracts";

export type CardMenuEntry = {
  id: string;
  title: string;
  /** The current status carries the system checkmark. */
  checked?: boolean;
  image?: string;
  subactions?: CardMenuEntry[];
};

export type CardMenuAction =
  | { type: "move"; status: TicketStatus }
  | { type: "approve" }
  | { type: "open" };

const MOVE = "move:";

/** The long-press menu: Move to (every status), Approve while In review, Open. */
export function cardMenu(
  card: { status: TicketStatus; canApprove: boolean },
  labels: {
    moveTo: string;
    approve: string;
    open: string;
    statuses: Record<TicketStatus, string>;
  },
): CardMenuEntry[] {
  return [
    {
      id: "move",
      title: labels.moveTo,
      image: "arrow.right.circle",
      subactions: TICKET_STATUSES.map((status) => ({
        id: `${MOVE}${status}`,
        title: labels.statuses[status],
        checked: status === card.status,
      })),
    },
    ...(card.canApprove
      ? [{ id: "approve", title: labels.approve, image: "checkmark.circle" }]
      : []),
    { id: "open", title: labels.open, image: "arrow.up.right.square" },
  ];
}

export function parseCardMenuAction(id: string): CardMenuAction | null {
  if (id === "approve") return { type: "approve" };
  if (id === "open") return { type: "open" };
  if (id.startsWith(MOVE)) {
    const status = TICKET_STATUSES.find((value) => value === id.slice(MOVE.length));
    return status ? { type: "move", status } : null;
  }
  return null;
}
