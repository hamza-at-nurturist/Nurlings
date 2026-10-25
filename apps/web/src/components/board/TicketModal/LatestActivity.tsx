import { useLingui } from "@lingui/react/macro";
import type { Bot } from "@rakazo/contracts";
import { ChevronRight } from "lucide-react";
import { formatRelativeTime } from "../../../lib/relative-time";
import type { Viewer } from "./ActivityFeed";
import type { ActivityItem } from "./activity";

type Props = {
  items: ActivityItem[];
  bots: Bot[];
  viewer: Viewer;
  onOpen: () => void;
};

/** The newest comment in one line on the narrow Ticket tab; tapping it opens the Activity tab. */
export function LatestActivity({ items, bots, viewer, onOpen }: Props) {
  const { t } = useLingui();
  const latest = items.findLast(
    (item): item is Extract<ActivityItem, { kind: "comment" }> =>
      item.kind === "comment" && item.comment.body.trim().length > 0,
  );
  if (!latest) return null;
  const { comment } = latest;
  const name = comment.authorBotId
    ? (bots.find((bot) => bot.id === comment.authorBotId)?.name ?? comment.authorName ?? t`Someone`)
    : comment.authorUserId === viewer.id
      ? t`You`
      : (comment.authorName ?? t`Someone`);
  return (
    <button
      type="button"
      data-testid="ticket-latest-activity"
      onClick={onOpen}
      className="flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-3 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{name}:</span> {comment.body.replace(/\s+/g, " ")}
      </span>
      <time dateTime={latest.at} className="shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(latest.at)}
      </time>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
