import { MenuView } from "@expo/ui/community/menu";
import type { TicketListItem, TicketStatus } from "@rakazo/contracts";
import type { TicketCard } from "@rakazo/core/nurlings-board";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../lib/i18n";
import { useMobileTokens, useResolvedAppearance } from "../../lib/native";
import type { CardMenuAction } from "../../lib/nurlings-board/card-menu";
import { cardMenu, parseCardMenuAction } from "../../lib/nurlings-board/card-menu";
import { statusLabels } from "../../lib/nurlings-board/labels";
import { NativeSymbol } from "../native-symbol";
import { OwnerMark, Pill, toMenuActions } from "./shared";

/** One ticket on the board. Tap opens it; long-press opens the native menu. */
export function BoardCard({
  card,
  status,
  onAction,
}: {
  card: TicketCard;
  status: TicketListItem["status"];
  onAction: (action: CardMenuAction) => void;
}) {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  const scheme = useResolvedAppearance();
  const menu = cardMenu(
    { status: status as TicketStatus, canApprove: card.canApprove },
    {
      moveTo: t("Move to"),
      approve: t("Approve"),
      open: t("Open"),
      statuses: statusLabels(),
    },
  );
  const workerName = card.worker?.name;
  const dueColor = card.dates.overdue ? tokens.destructive : tokens.mutedForeground;
  return (
    <MenuView
      actions={toMenuActions(menu)}
      colorScheme={scheme}
      shouldOpenOnLongPress
      onPressAction={({ nativeEvent }) => {
        const action = parseCardMenuAction(nativeEvent.event);
        if (action) onAction(action);
      }}
    >
      <Pressable
        testID={`board-card-${card.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${card.ref}, ${card.title}`}
        onPress={() => onAction({ type: "open" })}
        style={[
          styles.card,
          {
            backgroundColor: tokens.card,
            borderColor: card.needsUser ? tokens.faintForeground : tokens.border,
            opacity: card.finished ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.top}>
          <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>{card.ref}</Text>
          {card.needsUser ? (
            <Pill background={tokens.muted} foreground={tokens.foreground}>
              {t("Needs you")}
            </Pill>
          ) : null}
        </View>
        <Text
          style={[typeScale.secondary, { color: tokens.foreground, fontWeight: fontWeight.medium }]}
        >
          {card.title}
        </Text>
        {workerName ? (
          <Text numberOfLines={1} style={[typeScale.footnote, { color: tokens.statusWorking }]}>
            {t("{name} is working…", { name: workerName })}
          </Text>
        ) : card.lastComment ? (
          <Text numberOfLines={2} style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
            {card.lastComment}
          </Text>
        ) : null}
        <View style={styles.footer}>
          {card.owner ? (
            <OwnerMark
              bot={card.owner}
              working={card.ownerWorking}
              color={tokens.mutedForeground}
            />
          ) : null}
          {card.hasDates ? (
            <View style={styles.meta}>
              <NativeSymbol ios="calendar" android="calendar-outline" size={12} color={dueColor} />
              <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
                {card.dates.start ? `${card.dates.start} – ` : ""}
                <Text style={{ color: dueColor }}>{card.dates.due ?? ""}</Text>
              </Text>
            </View>
          ) : null}
          {card.fileCount > 0 ? (
            <View style={styles.meta} accessibilityLabel={t("Files")}>
              <NativeSymbol
                ios="paperclip"
                android="attach-outline"
                size={12}
                color={tokens.mutedForeground}
              />
              <Text style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
                {card.fileCount}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </MenuView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 12, gap: 8 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 4,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
});
