import { t } from "@lingui/core/macro";
import type { TicketPriority, TicketStatus } from "@rakazo/contracts";
import type { RelativeDayLabels } from "@rakazo/core/nurlings-board";

/** Column and chip names. Same words as the web board. */
export function statusLabels(): Record<TicketStatus, string> {
  return {
    todo: t`To do`,
    doing: t`In progress`,
    review: t`In review`,
    blocked: t`Blocked`,
    done: t`Done`,
    closed: t`Won't do`,
    archived: t`Closed`,
  };
}

export function priorityLabels(): Record<TicketPriority, string> {
  return { low: t`Low`, normal: t`Normal`, high: t`High`, urgent: t`Urgent` };
}

export function relativeDayLabels(): RelativeDayLabels {
  return { today: t`Today`, tomorrow: t`Tomorrow`, yesterday: t`Yesterday` };
}
