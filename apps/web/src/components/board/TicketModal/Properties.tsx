import { Trans, useLingui } from "@lingui/react/macro";
import type { Bot, Ticket, TicketPriority, TicketStatus } from "@rakazo/contracts";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@rakazo/contracts";
import {
  BotAvatar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@rakazo/ui-web";
import { useTicketPriorityLabels } from "../../../lib/ticket-priority";
import { useTicketStatusLabels } from "../../../lib/ticket-status";

const STATUS_DOT: Record<TicketStatus, string> = {
  todo: "bg-muted-foreground",
  doing: "bg-primary",
  review: "bg-warning",
  blocked: "bg-destructive",
  done: "bg-success",
  closed: "bg-muted-foreground",
};

const MENU = "w-auto min-w-40";
const TRIGGER =
  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

type Props = {
  ticket: Ticket;
  bots: Bot[];
  disabled: boolean;
  onChange: (
    patch: Partial<{ status: TicketStatus; assigneeBotId: string; priority: TicketPriority }>,
  ) => void;
};

/** Status, owner and priority, each changed in place from its own menu. */
export function Properties({ ticket, bots, disabled, onChange }: Props) {
  const { t } = useLingui();
  const statuses = useTicketStatusLabels();
  const priorities = useTicketPriorityLabels();
  const owner = bots.find((bot) => bot.id === ticket.assigneeBotId);
  return (
    <dl className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">
        <Trans>Status</Trans>
      </dt>
      <dd>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            aria-label={t`Status`}
            data-testid="ticket-status"
            className={`${TRIGGER} border border-border bg-card`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${STATUS_DOT[ticket.status]}`}
            />
            {statuses[ticket.status]}
          </DropdownMenuTrigger>
          <DropdownMenuContent className={MENU}>
            <DropdownMenuRadioGroup
              value={ticket.status}
              onValueChange={(value) => onChange({ status: value as TicketStatus })}
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
      </dd>
      <dt className="text-muted-foreground">
        <Trans>Owner</Trans>
      </dt>
      <dd>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            aria-label={t`Owner`}
            data-testid="ticket-owner"
            className={`${TRIGGER} -ml-2.5`}
          >
            {owner ? (
              <BotAvatar color={owner.color} identity={owner.id} status={owner.status} size={20} />
            ) : null}
            {owner?.name}
          </DropdownMenuTrigger>
          <DropdownMenuContent className={MENU}>
            <DropdownMenuRadioGroup
              value={ticket.assigneeBotId ?? ""}
              onValueChange={(value) => onChange({ assigneeBotId: value })}
            >
              {bots.map((bot) => (
                <DropdownMenuRadioItem key={bot.id} value={bot.id}>
                  <BotAvatar color={bot.color} identity={bot.id} status={bot.status} size={18} />
                  {bot.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </dd>
      <dt className="text-muted-foreground">
        <Trans>Priority</Trans>
      </dt>
      <dd>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            aria-label={t`Priority`}
            data-testid="ticket-priority"
            className={`${TRIGGER} -ml-2.5`}
          >
            {priorities[ticket.priority]}
          </DropdownMenuTrigger>
          <DropdownMenuContent className={MENU}>
            <DropdownMenuRadioGroup
              value={ticket.priority}
              onValueChange={(value) => onChange({ priority: value as TicketPriority })}
            >
              {TICKET_PRIORITIES.map((value) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  {priorities[value]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </dd>
    </dl>
  );
}
