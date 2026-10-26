import { ChatMarkdown } from "@rakazo/chat-ui/native";
import type { Artifact, Bot, TicketComment, TicketRun, TicketStatus } from "@rakazo/contracts";
import { botHexColor, WORKING_RUN_STATUSES } from "@rakazo/core";
import type {
  ActivityActor,
  ActivityItem,
  ActivityLine,
  Viewer,
} from "@rakazo/core/nurlings-board";
import { activityRows, resolveMentionTargets, splitMentions } from "@rakazo/core/nurlings-board";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { dateLocaleForUi, useI18n } from "../../lib/i18n";
import { useMobileTokens, useResolvedAppearance } from "../../lib/native";
import { statusLabels } from "../../lib/nurlings-board/labels";
import { withAlpha } from "../../lib/ripple";
import { BotAvatar } from "../bot-avatar";
import { TimeSeparator } from "../time-separator";
import { FileRow, ImageThumb } from "./ticket-files";

/** The feed: comments as cards, everything else as a quiet line, newest at the bottom. */
export function ActivityFeed({
  items,
  bots,
  viewer,
  files,
  runs,
  ownerBotId,
}: {
  items: ActivityItem[];
  bots: Bot[];
  viewer: Viewer;
  files: Artifact[];
  runs: TicketRun[];
  ownerBotId: string | null;
}) {
  const { t, locale } = useI18n();
  const tokens = useMobileTokens();
  const scheme = useResolvedAppearance();
  const scroll = useRef<ScrollView>(null);
  const statuses = statusLabels();
  const working = runs.filter((run) =>
    WORKING_RUN_STATUSES.some((status) => status === run.status),
  );
  const last = `${items.at(-1)?.id}:${working.length}`;
  useEffect(() => {
    scroll.current?.scrollToEnd({ animated: false });
  }, [last]);

  const botName = (id: string | null) =>
    (id ? bots.find((bot) => bot.id === id)?.name : undefined) ?? t("Someone");
  const actorText = (actor: ActivityActor) => (actor.you ? t("You") : (actor.name ?? t("Someone")));
  const lineText = (line: ActivityLine): string => {
    switch (line.kind) {
      case "created":
        return line.owner
          ? t("{actor} created this and assigned it to {owner}", {
              actor: actorText(line.actor),
              owner: line.owner,
            })
          : t("{actor} created this", { actor: actorText(line.actor) });
      case "moved":
        return t("{actor} moved it to {status}", {
          actor: actorText(line.actor),
          status: statuses[line.status as TicketStatus],
        });
      case "assigned":
        return t("{actor} assigned it to {owner}", {
          actor: actorText(line.actor),
          owner: line.owner,
        });
      case "approved":
        return t("{actor} approved it", { actor: actorText(line.actor) });
      case "resumed":
        return t("Moved back to {status}", { status: statuses[line.status as TicketStatus] });
      case "attached":
        return line.actor.you
          ? t("You attached {name}", { name: line.name })
          : t("{actor} attached {name}", { actor: actorText(line.actor), name: line.name });
      case "failed":
        return t("{name} couldn't finish, reply to retry", { name: line.name ?? t("Someone") });
    }
  };

  const time = (at: string) =>
    new Date(at).toLocaleTimeString(dateLocaleForUi(locale), {
      hour: "numeric",
      minute: "2-digit",
    });
  const rows = activityRows(items, { bots, viewerId: viewer.id });

  const renderComment = (comment: TicketComment) => {
    const bot = comment.authorBotId
      ? bots.find((row) => row.id === comment.authorBotId)
      : undefined;
    const mine = !comment.authorBotId && comment.authorUserId === viewer.id;
    const name = mine ? t("You") : (bot?.name ?? comment.authorName ?? t("Someone"));
    const targets = resolveMentionTargets(comment.mentions ?? [], bots, viewer);
    return (
      <View style={[styles.card, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
        <View style={styles.author}>
          {comment.authorBotId ? (
            <BotAvatar
              color={bot?.color ?? tokens.faintForeground}
              identity={comment.authorBotId}
              size={22}
              status={bot?.status}
              motion="lazy"
            />
          ) : (
            <View style={[styles.initial, { backgroundColor: tokens.muted }]}>
              <Text
                style={[
                  typeScale.footnote,
                  { color: tokens.foreground, fontWeight: fontWeight.semibold },
                ]}
              >
                {(mine ? viewer.name : name).trim().charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={[
              typeScale.secondary,
              { color: tokens.foreground, fontWeight: fontWeight.semibold, flex: 1 },
            ]}
          >
            {name}
          </Text>
          <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
            {time(comment.createdAt)}
          </Text>
        </View>
        {targets.length ? (
          <Text style={[typeScale.secondary, { color: tokens.foreground }]}>
            {splitMentions(comment.body, targets).map((segment, index) => {
              if (segment.type === "text") return segment.text;
              const hex = segment.target.color ? botHexColor(segment.target.color) : undefined;
              return (
                <Text
                  key={`${index}-${segment.text}`}
                  style={{
                    backgroundColor: hex ? withAlpha(hex, 0.16) : tokens.muted,
                    color: hex ?? tokens.foreground,
                    fontWeight: fontWeight.semibold,
                  }}
                >
                  {` ${segment.text} `}
                </Text>
              );
            })}
          </Text>
        ) : (
          <ChatMarkdown palette={tokens} colorScheme={scheme}>
            {comment.body}
          </ChatMarkdown>
        )}
        {comment.attachments?.length ? (
          <View style={styles.attachments}>
            {comment.attachments.map((block) => {
              const file = files.find((row) => row.id === block.artifactId);
              const botId = file?.botId ?? ownerBotId;
              if (!botId) return null;
              const shown = {
                id: block.artifactId,
                botId,
                name: block.name,
                mimeType: block.mimeType,
                size: file?.size ?? ("size" in block ? block.size : 0),
              };
              return block.kind === "image" ? (
                <ImageThumb key={block.artifactId} file={shown} size={96} />
              ) : (
                <FileRow key={block.artifactId} file={shown} />
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScrollView
      ref={scroll}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={styles.content}
    >
      {rows.map(({ item, line, separated }, index) => {
        const gap = index === 0 || separated ? 0 : 8;
        return (
          <View key={item.id} style={{ marginTop: gap }}>
            {separated ? <TimeSeparator createdAt={item.at} /> : null}
            {item.kind === "comment" ? (
              renderComment(item.comment)
            ) : line ? (
              <Text
                style={[typeScale.caption, { color: tokens.mutedForeground, paddingHorizontal: 4 }]}
              >
                {lineText(line)}
              </Text>
            ) : null}
          </View>
        );
      })}
      {working.map((run) => (
        <Text
          key={`working-${run.botId}`}
          accessibilityRole="text"
          style={[
            typeScale.caption,
            { color: tokens.statusWorking, paddingHorizontal: 4, marginTop: 8 },
          ]}
        >
          {t("{name} is working…", { name: botName(run.botId) })}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 12 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 8 },
  author: { flexDirection: "row", alignItems: "center", gap: 8 },
  initial: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  attachments: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
