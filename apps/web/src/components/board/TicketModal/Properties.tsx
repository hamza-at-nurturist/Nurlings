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
import { CHIP } from "./chip";
import { DatePicker } from "./DatePicker";
import { isTicketOverdue } from "./dates";

export const STATUS_DOT: Record<TicketStatus, string> = {
  todo: "bg-muted-foreground",
  doing: "bg-primary",
  review: "bg-warning",
  blocked: "bg-destructive",
  done: "bg-success",
  closed: "bg-muted-foreground",
};

const MENU = "w-auto min-w-40";
/** Menu rows sized for a finger on the narrow sheet. */
const ITEM = "min-h-11";
const TRIGGER =
  "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export type PropertiesPatch = Partial<{
  status: TicketStatus;
  assigneeBotId: string;
  priority: TicketPriority;
  start: string | null;
  due: string | null;
}>;

type Props = {
  ticket: Ticket;
  bots: Bot[];
  /** The user's saved timezone, which dates are shown and picked in. */
  timeZone: string;
  disabled: boolean;
  /** A labelled grid on the wide modal, a row of chips on the narrow sheet. */
  layout?: "grid" | "chips";
  onChange: (patch: PropertiesPatch) => void;
};

/** Status, owner, priority, start and due, each changed in place from its own menu. */
export function Properties({ ticket, bots, timeZone, disabled, layout = "grid", onChange }: Props) {
  const { t } = useLingui();
  const statuses = useTicketStatusLabels();
  const priorities = useTicketPriorityLabels();
  const owner = bots.find((bot) => bot.id === ticket.assigneeBotId);
  const chips = layout === "chips";

  const status = (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={t`Status`}
        data-testid="ticket-status"
        className={chips ? `${CHIP} font-medium` : `${TRIGGER} border border-border bg-card`}
      >
        <span
          aria-hidden="true"
          className={`${chips ? "size-2" : "size-1.5"} rounded-full ${STATUS_DOT[ticket.status]}`}
        />
        {statuses[ticket.status]}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={MENU}>
        <DropdownMenuRadioGroup
          value={ticket.status}
          onValueChange={(value) => onChange({ status: value as TicketStatus })}
        >
          {TICKET_STATUSES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} className={chips ? ITEM : undefined}>
              <span aria-hidden="true" className={`size-1.5 rounded-full ${STATUS_DOT[value]}`} />
              {statuses[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const ownerMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={t`Owner`}
        data-testid="ticket-owner"
        className={chips ? CHIP : `${TRIGGER} -ml-2.5`}
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
            <DropdownMenuRadioItem key={bot.id} value={bot.id} className={chips ? ITEM : undefined}>
              <BotAvatar color={bot.color} identity={bot.id} status={bot.status} size={18} />
              {bot.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const priority = (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        aria-label={t`Priority`}
        data-testid="ticket-priority"
        className={chips ? CHIP : `${TRIGGER} -ml-2.5`}
      >
        {priorities[ticket.priority]}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={MENU}>
        <DropdownMenuRadioGroup
          value={ticket.priority}
          onValueChange={(value) => onChange({ priority: value as TicketPriority })}
        >
          {TICKET_PRIORITIES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value} className={chips ? ITEM : undefined}>
              {priorities[value]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const start = (
    <DatePicker
      key={`start-${ticket.startAt}-${ticket.startHasTime}`}
      label={t`Start`}
      testId="ticket-start"
      value={ticket.startAt ? { at: ticket.startAt, hasTime: ticket.startHasTime } : null}
      timeZone={timeZone}
      disabled={disabled}
      chip={chips}
      onChange={(start) => onChange({ start })}
    />
  );
  const due = (
    <DatePicker
      key={`due-${ticket.dueAt}-${ticket.dueHasTime}`}
      label={t`Due`}
      testId="ticket-due"
      value={ticket.dueAt ? { at: ticket.dueAt, hasTime: ticket.dueHasTime } : null}
      timeZone={timeZone}
      disabled={disabled}
      overdue={isTicketOverdue(ticket, new Date())}
      chip={chips}
      onChange={(due) => onChange({ due })}
    />
  );

  if (chips)
    return (
      <div data-testid="ticket-chips" className="flex flex-wrap gap-2">
        {status}
        {ownerMenu}
        {due}
        {start}
        {priority}
      </div>
    );
  return (
    <dl className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">
        <Trans>Status</Trans>
      </dt>
      <dd>{status}</dd>
      <dt className="text-muted-foreground">
        <Trans>Owner</Trans>
      </dt>
      <dd>{ownerMenu}</dd>
      <dt className="text-muted-foreground">
        <Trans>Priority</Trans>
      </dt>
      <dd>{priority}</dd>
      <dt className="text-muted-foreground">
        <Trans>Start</Trans>
      </dt>
      <dd>{start}</dd>
      <dt className="text-muted-foreground">
        <Trans>Due</Trans>
      </dt>
      <dd>{due}</dd>
    </dl>
  );
}
