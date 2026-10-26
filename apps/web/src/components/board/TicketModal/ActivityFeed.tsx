import { i18n } from "@lingui/core";
import { useLingui } from "@lingui/react/macro";
import { ChatMarkdown } from "@rakazo/chat-ui/web";
import type { Artifact, Bot, TicketComment, TicketRun } from "@rakazo/contracts";
import { WORKING_RUN_STATUSES } from "@rakazo/core";
import type {
  ActivityActor,
  ActivityItem,
  ActivityLine,
  Viewer,
} from "@rakazo/core/nurlings-board";
import { activityRows, resolveMentionTargets } from "@rakazo/core/nurlings-board";
import { BotAvatar } from "@rakazo/ui-web";
import { Fragment, useEffect, useRef } from "react";
import { formatRelativeTime } from "../../../lib/relative-time";
import { useTicketStatusLabels } from "../../../lib/ticket-status";
import { TimeSeparator } from "../../../pages/shell/chat-context";
import { FALLBACK_BOT_COLOR } from "../../../pages/shell/chat-shared";
import { Shimmer } from "../../ai/primitives";
import { MentionText } from "./MentionText";
import { TicketFileCard } from "./TicketFileCard";

type Props = {
  items: ActivityItem[];
  bots: Bot[];
  viewer: Viewer;
  /** The ticket's files, which know the Nurling each upload belongs to. */
  files?: Artifact[];
  /** Each Nurling's latest run for the ticket, which says who is working. */
  runs?: TicketRun[];
  ownerBotId?: string | null;
};

function Time({ at }: { at: string }) {
  return (
    <time dateTime={at} className="shrink-0 text-xs text-muted-foreground">
      {formatRelativeTime(at)}
    </time>
  );
}

/** A user's picture, or their initial. Nurlings never use this, they use `BotAvatar`. */
function UserMark({ name, image }: { name: string; image?: string | null }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-5 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-foreground"
    >
      {image ? (
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        name.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function ActivityFeed({
  items,
  bots,
  viewer,
  files = [],
  runs = [],
  ownerBotId = null,
}: Props) {
  const { t } = useLingui();
  const statuses = useTicketStatusLabels();
  const end = useRef<HTMLDivElement>(null);
  const working = runs.filter((run) =>
    WORKING_RUN_STATUSES.some((status) => status === run.status),
  );
  const last = `${items.at(-1)?.id}:${working.length}`;
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [last]);

  const botName = (id: string | null, fallback: string | null) =>
    (id ? bots.find((bot) => bot.id === id)?.name : undefined) ?? fallback;
  const actorText = (actor: ActivityActor) => (actor.you ? t`You` : (actor.name ?? t`Someone`));

  function lineText(line: ActivityLine): string {
    switch (line.kind) {
      case "created": {
        const actor = actorText(line.actor);
        const owner = line.owner;
        return owner
          ? t`${actor} created this and assigned it to ${owner}`
          : t`${actor} created this`;
      }
      case "moved": {
        const actor = actorText(line.actor);
        return t`${actor} moved it to ${statuses[line.status]}`;
      }
      case "assigned": {
        const actor = actorText(line.actor);
        const owner = line.owner;
        return t`${actor} assigned it to ${owner}`;
      }
      case "approved": {
        const actor = actorText(line.actor);
        return t`${actor} approved it`;
      }
      case "resumed":
        return t`Moved back to ${statuses[line.status]}`;
      case "attached": {
        const name = line.name;
        if (line.actor.you) return t`You attached ${name}`;
        const actor = actorText(line.actor);
        return t`${actor} attached ${name}`;
      }
      case "failed": {
        const name = line.name ?? t`Someone`;
        return t`${name} couldn't finish, reply to retry`;
      }
    }
  }

  function author(comment: TicketComment) {
    const bot = comment.authorBotId
      ? bots.find((row) => row.id === comment.authorBotId)
      : undefined;
    const mine = !comment.authorBotId && comment.authorUserId === viewer.id;
    const name = mine ? t`You` : (comment.authorName ?? t`Someone`);
    const mark = comment.authorBotId ? (
      <BotAvatar
        color={bot?.color ?? FALLBACK_BOT_COLOR}
        identity={comment.authorBotId}
        status={bot?.status}
        size={20}
      />
    ) : (
      <UserMark name={mine ? viewer.name : name} image={mine ? viewer.image : null} />
    );
    return { name, mark };
  }

  // What shows, each with whether a time separator opens it.
  const rows = activityRows(items, { bots, viewerId: viewer.id }).map((row) => ({
    item: row.item,
    line: row.line ? lineText(row.line) : null,
    separated: row.separated,
  }));

  return (
    <ol data-testid="ticket-activity" className="flex flex-col">
      {rows.map(({ item, line, separated }, index) => {
        const spacing = index === 0 || separated ? "" : "mt-2";
        const separator = separated ? (
          <li key={`${item.id}-separator`} aria-hidden="true">
            <TimeSeparator createdAt={item.at} locale={i18n.locale || "en"} />
          </li>
        ) : null;
        if (item.kind !== "comment")
          return (
            <Fragment key={item.id}>
              {separator}
              <li
                className={`flex items-baseline justify-between gap-3 px-1 text-xs text-muted-foreground ${spacing}`}
              >
                <span className="min-w-0">{line}</span>
                <Time at={item.at} />
              </li>
            </Fragment>
          );
        const { name, mark } = author(item.comment);
        return (
          <Fragment key={item.id}>
            {separator}
            <li className={`rounded-xl border border-border bg-card p-3 text-sm ${spacing}`}>
              <div className="mb-1.5 flex items-center gap-2">
                {mark}
                <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
                <Time at={item.at} />
              </div>
              {item.comment.mentions?.length ? (
                <MentionText
                  body={item.comment.body}
                  targets={resolveMentionTargets(item.comment.mentions, bots, viewer)}
                />
              ) : (
                <ChatMarkdown>{item.comment.body}</ChatMarkdown>
              )}
              {item.comment.attachments?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.comment.attachments.map((block) => {
                    const file = files.find((row) => row.id === block.artifactId);
                    const botId = file?.botId ?? ownerBotId;
                    if (!botId) return null;
                    return (
                      <TicketFileCard
                        key={block.artifactId}
                        file={{
                          id: block.artifactId,
                          botId,
                          name: block.name,
                          mimeType: block.mimeType,
                          size: file?.size ?? ("size" in block ? block.size : 0),
                        }}
                      />
                    );
                  })}
                </div>
              ) : null}
            </li>
          </Fragment>
        );
      })}
      {working.map((run) => {
        const name = botName(run.botId, null) ?? t`Someone`;
        return (
          <li
            key={`working-${run.botId}`}
            role="status"
            data-testid="ticket-working"
            className="mt-2 px-1 text-xs"
          >
            <Shimmer>{t`${name} is working…`}</Shimmer>
          </li>
        );
      })}
      <div ref={end} />
    </ol>
  );
}
