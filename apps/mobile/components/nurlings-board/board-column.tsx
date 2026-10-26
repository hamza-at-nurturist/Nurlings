import type { Bot, TicketListItem, TicketStatus } from "@rakazo/contracts";
import { ticketCard } from "@rakazo/core/nurlings-board";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { dateLocaleForUi, useI18n } from "../../lib/i18n";
import { useMobileTokens } from "../../lib/native";
import type { CardMenuAction } from "../../lib/nurlings-board/card-menu";
import { relativeDayLabels, statusLabels } from "../../lib/nurlings-board/labels";
import { withAlpha } from "../../lib/ripple";
import { BoardCard } from "./board-card";
import { Pill, StatusDot } from "./shared";

/** One column page: its header, then its cards. */
export function BoardColumn({
  status,
  tickets,
  older,
  showOlder,
  onShowOlder,
  bots,
  timeZone,
  width,
  height,
  bottomInset,
  refreshing,
  onRefresh,
  onAction,
}: {
  status: TicketStatus;
  tickets: TicketListItem[];
  older: TicketListItem[];
  showOlder: boolean;
  onShowOlder: () => void;
  bots: Bot[];
  timeZone: string;
  width: number;
  height: number;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
  onAction: (ticket: TicketListItem, action: CardMenuAction) => void;
}) {
  const { t, locale } = useI18n();
  const tokens = useMobileTokens();
  const shown = showOlder ? [...tickets, ...older] : tickets;
  const yourTurn = status === "review" && shown.length > 0;
  const now = new Date();
  const labels = relativeDayLabels();
  return (
    <View
      style={[
        styles.page,
        {
          width,
          height,
          backgroundColor: yourTurn ? withAlpha(tokens.warning, 0.08) : "transparent",
        },
      ]}
    >
      <View style={styles.header} accessibilityRole="header">
        <StatusDot status={status} tokens={tokens} />
        <Text
          style={[
            typeScale.secondary,
            { color: tokens.foreground, fontWeight: fontWeight.semibold },
          ]}
        >
          {statusLabels()[status]}
        </Text>
        <Text style={[typeScale.caption, { color: tokens.mutedForeground }]}>
          {tickets.length + older.length}
        </Text>
        {yourTurn ? (
          <View style={styles.turn}>
            <Pill background={tokens.warning} foreground="#000000">
              {t("Your turn")}
            </Pill>
          </View>
        ) : null}
      </View>
      <FlatList
        data={shown}
        keyExtractor={(ticket) => ticket.id}
        nestedScrollEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={[styles.list, { paddingBottom: bottomInset }]}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <BoardCard
            status={item.status}
            card={ticketCard(item, {
              bots,
              now,
              timeZone,
              labels,
              locale: dateLocaleForUi(locale),
            })}
            onAction={(action) => onAction(item, action)}
          />
        )}
        ListFooterComponent={
          !showOlder && older.length > 0 ? (
            <Pressable accessibilityRole="button" onPress={onShowOlder} style={styles.older}>
              <Text style={[typeScale.caption, { color: tokens.mutedForeground }]}>
                {t("Show {count} older", { count: older.length })}
              </Text>
            </Pressable>
          ) : null
        }
      />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  page: { borderRadius: 16, overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  turn: { marginLeft: "auto" },
  list: { paddingHorizontal: 8, paddingTop: 2 },
  separator: { height: 10 },
  older: { paddingVertical: 12, paddingHorizontal: 6 },
});
