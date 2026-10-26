import type { Bot, TicketListItem } from "@rakazo/contracts";
import type { CardDatesInfo } from "./dates.js";
import { cardDates, type RelativeDayLabels } from "./dates.js";

export type TicketCard = {
  id: string;
  ref: string;
  title: string;
  needsUser: boolean;
  owner: Bot | undefined;
  /** The Nurling with an active run for the ticket, when there is one. */
  worker: Bot | undefined;
  /** The owner is the one working, so its avatar shows working. */
  ownerWorking: boolean;
  lastComment: string | null;
  dates: CardDatesInfo;
  hasDates: boolean;
  fileCount: number;
  /** Done and Won't do cards are dimmed. */
  finished: boolean;
  canApprove: boolean;
};

/** Everything a board card shows, from one ticket-list row, in the shape both clients render. */
export function ticketCard(
  ticket: TicketListItem,
  context: {
    bots: readonly Bot[];
    now: Date;
    timeZone: string;
    labels: RelativeDayLabels;
    locale?: string;
  },
): TicketCard {
  const owner = context.bots.find((bot) => bot.id === ticket.assigneeBotId);
  const worker = ticket.workingBotId
    ? context.bots.find((bot) => bot.id === ticket.workingBotId)
    : undefined;
  const dates = cardDates(ticket, context.now, context.timeZone, context.labels, context.locale);
  return {
    id: ticket.id,
    ref: ticket.ref,
    title: ticket.title,
    needsUser: ticket.needsUser,
    owner,
    worker,
    ownerWorking: Boolean(worker && worker.id === owner?.id),
    lastComment: ticket.lastComment,
    dates,
    hasDates: Boolean(dates.start || dates.due),
    fileCount: ticket.fileCount,
    finished: ticket.status === "done" || ticket.status === "closed",
    canApprove: ticket.status === "review",
  };
}
