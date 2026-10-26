import type { MenuAction } from "@expo/ui/community/menu";
import type { Bot, TicketStatus } from "@rakazo/contracts";
import { fontWeight, typeScale } from "@rakazo/ui-tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { mobileTokens } from "../../lib/appearance";
import type { CardMenuEntry } from "../../lib/nurlings-board/card-menu";
import { BotAvatar } from "../bot-avatar";

type Tokens = ReturnType<typeof mobileTokens>;

/** The dot in front of a status: the web board's colours, from the shared tokens. */
export function statusColor(status: TicketStatus, tokens: Tokens): string {
  switch (status) {
    case "doing":
      return tokens.statusWorking;
    case "review":
      return tokens.warning;
    case "blocked":
      return tokens.destructive;
    case "done":
      return tokens.success;
    default:
      return tokens.faintForeground;
  }
}

export function StatusDot({ status, tokens }: { status: TicketStatus; tokens: Tokens }) {
  return <View style={[styles.dot, { backgroundColor: statusColor(status, tokens) }]} />;
}

/** A Nurling's avatar and name on one line. */
export function OwnerMark({
  bot,
  working,
  size = 18,
  color,
}: {
  bot: Bot;
  working: boolean;
  size?: number;
  color: string;
}) {
  return (
    <View style={styles.owner}>
      <BotAvatar
        color={bot.color}
        identity={bot.id}
        size={size}
        status={working ? "running" : undefined}
        motion="lazy"
      />
      <Text numberOfLines={1} style={[typeScale.footnote, { color, flexShrink: 1 }]}>
        {bot.name}
      </Text>
    </View>
  );
}

export function Pill({
  children,
  background,
  foreground,
}: {
  children: ReactNode;
  background: string;
  foreground: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <Text style={[typeScale.footnote, { color: foreground, fontWeight: fontWeight.semibold }]}>
        {children}
      </Text>
    </View>
  );
}

/** The menu entries as the native menu takes them. */
export function toMenuActions(entries: readonly CardMenuEntry[]): MenuAction[] {
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title,
    ...(entry.image ? { image: entry.image as never } : {}),
    ...(entry.checked !== undefined
      ? { state: entry.checked ? ("on" as const) : ("off" as const) }
      : {}),
    ...(entry.subactions ? { subactions: toMenuActions(entry.subactions) } : {}),
  }));
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4 },
  owner: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" },
});
