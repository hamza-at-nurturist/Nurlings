import { useLingui } from "@lingui/react/macro";
import { ChatMarkdown } from "@rakazo/chat-ui/web";
import type { Artifact, Bot, TicketComment, TicketEvent } from "@rakazo/contracts";
import { BotAvatar } from "@rakazo/ui-web";
import { useEffect, useRef } from "react";
import { formatRelativeTime } from "../../../lib/relative-time";
import { useTicketStatusLabels } from "../../../lib/ticket-status";
import { FALLBACK_BOT_COLOR } from "../../../pages/shell/chat-shared";
import { ArtifactFileCard } from "../../ArtifactFileCard";
import type { ActivityItem } from "./activity";
import { MentionText } from "./MentionText";
import { resolveMentionTargets } from "./mentions";

export type Viewer = { id: string; name: string; image?: string | null };

type Props = {
  items: ActivityItem[];
  bots: Bot[];
  viewer: Viewer;
  /** The ticket's files, which know the Nurling each upload belongs to. */
  files?: Artifact[];
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

export function ActivityFeed({ items, bots, viewer, files = [], ownerBotId = null }: Props) {
  const { t } = useLingui();
  const statuses = useTicketStatusLabels();
  const end = useRef<HTMLDivElement>(null);
  const last = items.at(-1)?.id;
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: "end" });
  }, [last]);

  const botName = (id: string | null, fallback: string | null) =>
    (id ? bots.find((bot) => bot.id === id)?.name : undefined) ?? fallback;
  const actorName = (event: TicketEvent) =>
    event.actorBotId
      ? (botName(event.actorBotId, event.actorName) ?? t`Someone`)
      : event.actorUserId === viewer.id
        ? t`You`
        : (event.actorName ?? t`Someone`);

  function eventLine(event: TicketEvent): string | null {
    const actor = actorName(event);
    const owner = botName(event.assigneeBotId, event.assigneeName);
    if (event.kind === "created")
      return owner
        ? t`${actor} created this and assigned it to ${owner}`
        : t`${actor} created this`;
    if (event.kind === "status" && event.status)
      return t`${actor} moved it to ${statuses[event.status]}`;
    if (event.kind === "owner" && owner) return t`${actor} assigned it to ${owner}`;
    if (event.kind === "approved") return t`${actor} approved it`;
    return null;
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

  return (
    <ol data-testid="ticket-activity" className="flex flex-col gap-3">
      {items.map((item) => {
        if (item.kind === "event") {
          const line = eventLine(item.event);
          if (!line) return null;
          return (
            <li
              key={item.id}
              className="flex items-baseline justify-between gap-3 px-1 text-xs text-muted-foreground"
            >
              <span className="min-w-0">{line}</span>
              <Time at={item.at} />
            </li>
          );
        }
        const { name, mark } = author(item.comment);
        return (
          <li key={item.id} className="rounded-xl border border-border bg-card p-3 text-sm">
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
                    <ArtifactFileCard
                      key={block.artifactId}
                      target={{ botId }}
                      artifactId={block.artifactId}
                      name={block.name}
                      mimeType={block.mimeType}
                      size={file?.size ?? ("size" in block ? block.size : 0)}
                    />
                  );
                })}
              </div>
            ) : null}
          </li>
        );
      })}
      <div ref={end} />
    </ol>
  );
}
