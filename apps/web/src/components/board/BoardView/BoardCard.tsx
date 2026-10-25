import { Trans, useLingui } from "@lingui/react/macro";
import type { Bot, TicketListItem, TicketStatus } from "@rakazo/contracts";
import { TICKET_STATUSES } from "@rakazo/contracts";
import {
  BotAvatar,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@rakazo/ui-web";
import { Ellipsis, Paperclip } from "lucide-react";
import { useTicketStatusLabels } from "../../../lib/ticket-status";
import { Shimmer } from "../../ai/primitives";
import { CardDates } from "../TicketModal/CardDates";
import { NeedsYou } from "../TicketModal/NeedsYou";
import { STATUS_DOT } from "../TicketModal/Properties";

/** The drag payload type, so a drop only accepts board cards. */
export const CARD_DRAG_TYPE = "application/x-nurlings-ticket";

type Props = {
  ticket: TicketListItem;
  bots: Bot[];
  timeZone: string;
  busy: boolean;
  onOpen: () => void;
  onMove: (status: TicketStatus) => void;
  onApprove: () => void;
};

export function BoardCard({ ticket, bots, timeZone, busy, onOpen, onMove, onApprove }: Props) {
  const { t } = useLingui();
  const statuses = useTicketStatusLabels();
  const owner = bots.find((bot) => bot.id === ticket.assigneeBotId);
  const worker = ticket.workingBotId
    ? bots.find((bot) => bot.id === ticket.workingBotId)
    : undefined;
  const workerName = worker?.name;
  const finished = ticket.status === "done" || ticket.status === "closed";
  return (
    <article
      data-testid={`board-card-${ticket.id}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CARD_DRAG_TYPE, ticket.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-xl border bg-card p-3 text-card-foreground shadow-xs hover:border-foreground/20",
        finished && "opacity-70",
      )}
    >
      <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
        <span>{ticket.ref}</span>
        {ticket.needsUser ? <NeedsYou /> : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t`Move to`}
            data-testid="card-move"
            className="relative z-10 -my-1 ml-auto inline-flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none group-hover:opacity-100 hover:bg-accent focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:opacity-100 data-popup-open:opacity-100"
          >
            <Ellipsis size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto min-w-40">
            <DropdownMenuRadioGroup
              value={ticket.status}
              onValueChange={(value) => onMove(value as TicketStatus)}
            >
              {TICKET_STATUSES.map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <span
                    aria-hidden="true"
                    className={`size-1.5 rounded-full ${STATUS_DOT[value]}`}
                  />
                  {statuses[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <h3 className="text-sm leading-snug font-medium">
        <button
          type="button"
          data-testid="card-open"
          className="text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
          onClick={onOpen}
        >
          {ticket.title}
        </button>
      </h3>
      {workerName ? (
        <p data-testid="card-working" className="truncate text-xs">
          <Shimmer>
            <Trans>{workerName} is working…</Trans>
          </Shimmer>
        </p>
      ) : ticket.lastComment ? (
        <p
          data-testid="card-last"
          dir="auto"
          className="line-clamp-2 text-xs leading-relaxed break-words text-muted-foreground"
        >
          {ticket.lastComment}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {owner ? (
          <span data-testid="card-owner" className="inline-flex min-w-0 items-center gap-1.5">
            <BotAvatar
              color={owner.color}
              identity={owner.id}
              status={worker?.id === owner.id ? "running" : undefined}
              size={16}
            />
            <span className="truncate">{owner.name}</span>
          </span>
        ) : null}
        <CardDates ticket={ticket} timeZone={timeZone} />
        {ticket.fileCount > 0 ? (
          <span data-testid="card-files" className="inline-flex items-center gap-1">
            <Paperclip size={12} aria-hidden="true" />
            <span className="sr-only">{t`Files`}</span>
            {ticket.fileCount}
          </span>
        ) : null}
      </div>
      {ticket.status === "review" ? (
        <Button
          size="sm"
          className="relative z-10 rounded-full"
          disabled={busy}
          onClick={onApprove}
        >
          <Trans>Approve</Trans>
        </Button>
      ) : null}
    </article>
  );
}
