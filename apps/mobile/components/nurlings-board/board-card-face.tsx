import { useLingui } from "@lingui/react/macro";
import type { TicketCard } from "@rakazo/core/nurlings-board";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMobileTokens } from "../../lib/native";
import { NativeSymbol } from "../native-symbol";
import { OwnerMark, Pill } from "./shared";

/** What a card looks like. The list renders it with the ⋯ menu; the drag overlay renders a copy. */
export function BoardCardFace({ card, menu }: { card: TicketCard; menu: ReactNode }) {
  const { t } = useLingui();
  const tokens = useMobileTokens();
  const workerName = card.worker?.name;
  const dueColor = card.dates.overdue ? tokens.destructive : tokens.mutedForeground;
  return (
    <View
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
        <View style={styles.topEnd}>
          {card.needsUser ? (
            <Pill background={tokens.muted} foreground={tokens.foreground}>
              {t`Needs you`}
            </Pill>
          ) : null}
          {menu}
        </View>
      </View>
      <Text
        style={[
          typeScale.secondary,
          styles.shrink,
          { color: tokens.foreground, fontWeight: fontWeight.medium },
        ]}
      >
        {card.title}
      </Text>
      {workerName ? (
        <Text numberOfLines={1} style={[typeScale.footnote, { color: tokens.statusWorking }]}>
          {t`${workerName} is working…`}
        </Text>
      ) : card.lastComment ? (
        <Text numberOfLines={2} style={[typeScale.footnote, { color: tokens.mutedForeground }]}>
          {card.lastComment}
        </Text>
      ) : null}
      <View style={styles.footer}>
        {card.owner ? (
          <OwnerMark bot={card.owner} working={card.ownerWorking} color={tokens.mutedForeground} />
        ) : null}
        {card.hasDates ? (
          <View style={[styles.meta, styles.shrink]}>
            <NativeSymbol ios="calendar" android="calendar-outline" size={12} color={dueColor} />
            <Text style={[typeScale.footnote, styles.shrink, { color: tokens.mutedForeground }]}>
              {card.dates.start ? `${card.dates.start} – ` : ""}
              <Text style={{ color: dueColor }}>{card.dates.due ?? ""}</Text>
            </Text>
          </View>
        ) : null}
        {card.fileCount > 0 ? (
          <View style={styles.meta} accessibilityLabel={t`Files`}>
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
    </View>
  );
}

/** The ⋯ glyph. */
export function MoreGlyph() {
  const tokens = useMobileTokens();
  return (
    <View style={styles.more}>
      <NativeSymbol
        ios="ellipsis"
        android="ellipsis-horizontal"
        size={16}
        color={tokens.mutedForeground}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shrink: { flexShrink: 1, minWidth: 0 },
  card: {
    alignSelf: "stretch",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topEnd: { flexDirection: "row", alignItems: "center", gap: 6 },
  // Larger than the glyph so a thumb can hit it, without making the row taller.
  more: {
    width: 32,
    height: 24,
    marginVertical: -4,
    marginRight: -6,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 4,
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
});
