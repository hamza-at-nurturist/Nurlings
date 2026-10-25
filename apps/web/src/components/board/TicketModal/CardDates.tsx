import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import type { Ticket } from "@rakazo/contracts";
import { cardDates } from "@rakazo/core/nurlings-board";
import { CalendarDays } from "lucide-react";
import { useRelativeDayLabels } from "./DatePicker";

/** A card's dates on one line: "start – due", "start –" or "due". Nothing when there are none. */
export function CardDates({ ticket, timeZone }: { ticket: Ticket; timeZone: string }) {
  const { t } = useLingui();
  const labels = useRelativeDayLabels();
  if (!ticket.startAt && !ticket.dueAt) return null;
  const { start, due, overdue } = cardDates(
    ticket,
    new Date(),
    timeZone,
    labels,
    i18n.locale || "en",
  );
  const name = [start ? t`Start ${start}` : null, due ? t`Due ${due}` : null]
    .filter(Boolean)
    .join(", ");
  return (
    <span data-testid="card-dates" className="text-xs text-muted-foreground">
      <span className="sr-only">{name}</span>
      <span
        aria-hidden="true"
        data-testid="card-dates-shown"
        className="inline-flex items-center gap-1"
      >
        <CalendarDays size={12} />
        {start ? <span>{start} –</span> : null}
        {due ? <span className={overdue ? "text-destructive" : undefined}>{due}</span> : null}
      </span>
    </span>
  );
}
