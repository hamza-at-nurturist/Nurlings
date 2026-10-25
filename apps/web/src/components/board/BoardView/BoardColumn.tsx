import { Trans } from "@lingui/react/macro";
import type { TicketStatus } from "@rakazo/contracts";
import { Badge, cn } from "@rakazo/ui-web";
import type { DragEvent, ReactNode } from "react";
import { useState } from "react";
import { useTicketStatusLabels } from "../../../lib/ticket-status";
import { STATUS_DOT } from "../TicketModal/Properties";
import { CARD_DRAG_TYPE } from "./BoardCard";

type Props = {
  status: TicketStatus;
  count: number;
  /** Older Done tickets still hidden; the column offers to show them. */
  hidden: number;
  onShowOlder: () => void;
  onDropTicket: (ticketId: string) => void;
  children: ReactNode;
};

export function BoardColumn({ status, count, hidden, onShowOlder, onDropTicket, children }: Props) {
  const statuses = useTicketStatusLabels();
  const [over, setOver] = useState(false);
  const yours = status === "review" && count > 0;
  const accepts = (event: DragEvent) => event.dataTransfer.types.includes(CARD_DRAG_TYPE);
  return (
    <section
      aria-labelledby={`board-column-${status}`}
      data-testid={`board-column-${status}`}
      className={cn(
        "flex min-h-0 min-w-0 snap-start flex-col gap-2.5 overflow-y-auto rounded-2xl p-2.5 transition-colors",
        yours && "bg-warning/5",
        over && "bg-accent",
      )}
      onDragOver={(event) => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        setOver(false);
        const id = event.dataTransfer.getData(CARD_DRAG_TYPE);
        if (!id) return;
        event.preventDefault();
        onDropTicket(id);
      }}
    >
      <header className="flex items-center gap-2 px-1 pt-1">
        <span aria-hidden="true" className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
        <h2 id={`board-column-${status}`} className="text-sm font-semibold">
          {statuses[status]}
        </h2>
        <span data-testid="column-count" className="text-xs text-muted-foreground">
          {count}
        </span>
        {yours ? (
          <Badge className="ml-auto bg-warning text-background">
            <Trans>Your turn</Trans>
          </Badge>
        ) : null}
      </header>
      {children}
      {hidden > 0 ? (
        <button
          type="button"
          className="self-start rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={onShowOlder}
        >
          <Trans>Show {hidden} older</Trans>
        </button>
      ) : null}
    </section>
  );
}
