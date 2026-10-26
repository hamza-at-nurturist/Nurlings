import type { MenuAction } from "@expo/ui/community/menu";
import { MenuView } from "@expo/ui/community/menu";
import type { Bot, Ticket, TicketDateKind, TicketPriority, TicketStatus } from "@rakazo/contracts";
import { TICKET_PRIORITIES, TICKET_STATUSES } from "@rakazo/contracts";
import { formatTicketDate, isTicketOverdue, quickPickDates } from "@rakazo/core/nurlings-board";
import { typeScale } from "@rakazo/ui-tokens";
import type { ReactNode } from "react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { dateLocaleForUi, useI18n } from "../../lib/i18n";
import { useMobileTokens, useResolvedAppearance } from "../../lib/native";
import { pickerStart } from "../../lib/nurlings-board/date-input";
import { priorityLabels, relativeDayLabels, statusLabels } from "../../lib/nurlings-board/labels";
import { NativeSymbol } from "../native-symbol";
import { DatePickerSheet } from "./date-picker-sheet";
import { OwnerMark, StatusDot } from "./shared";

export type PropertiesPatch = Partial<{
  status: TicketStatus;
  assigneeBotId: string;
  priority: TicketPriority;
  start: string | null;
  due: string | null;
}>;

const OWNER = "owner:";
const STATUS = "status:";
const PRIORITY = "priority:";

function Chip({
  label,
  actions,
  onSelect,
  disabled,
  children,
}: {
  label: string;
  actions: MenuAction[];
  onSelect: (id: string) => void;
  disabled: boolean;
  children: ReactNode;
}) {
  const tokens = useMobileTokens();
  const scheme = useResolvedAppearance();
  return (
    <MenuView
      title={label}
      actions={actions}
      colorScheme={scheme}
      onPressAction={({ nativeEvent }) => {
        if (!disabled) onSelect(nativeEvent.event);
      }}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[styles.chip, { backgroundColor: tokens.muted, opacity: disabled ? 0.5 : 1 }]}
      >
        {children}
      </View>
    </MenuView>
  );
}

/** Status, owner, priority, start and due as chips; each opens a native menu or date picker. */
export function TicketProperties({
  ticket,
  bots,
  timeZone,
  disabled,
  onChange,
}: {
  ticket: Ticket;
  bots: Bot[];
  timeZone: string;
  disabled: boolean;
  onChange: (patch: PropertiesPatch) => void;
}) {
  const { t, locale } = useI18n();
  const tokens = useMobileTokens();
  const [picking, setPicking] = useState<TicketDateKind | null>(null);
  const statuses = statusLabels();
  const priorities = priorityLabels();
  const labels = relativeDayLabels();
  const owner = bots.find((bot) => bot.id === ticket.assigneeBotId);
  const now = new Date();
  const show = (at: string, hasTime: boolean) =>
    formatTicketDate({ at, hasTime }, now, timeZone, labels, dateLocaleForUi(locale));
  const overdue = isTicketOverdue(ticket, now);
  const quick = quickPickDates(now, timeZone);

  const dateChip = (kind: TicketDateKind, at: string | null, hasTime: boolean) => {
    const title = kind === "start" ? t("Start") : t("Due");
    const actions: MenuAction[] = [
      { id: "today", title: labels.today },
      { id: "tomorrow", title: labels.tomorrow },
      { id: "pick", title: t("Choose date…") },
      ...(at ? [{ id: "clear", title: t("Clear"), attributes: { destructive: true } }] : []),
    ];
    const red = kind === "due" && overdue;
    return (
      <Chip
        label={title}
        actions={actions}
        disabled={disabled}
        onSelect={(id) => {
          if (id === "pick") setPicking(kind);
          else if (id === "clear") onChange({ [kind]: null });
          else if (id === "today" || id === "tomorrow") onChange({ [kind]: quick[id] });
        }}
      >
        <NativeSymbol
          ios="calendar"
          android="calendar-outline"
          size={14}
          color={red ? tokens.destructive : tokens.mutedForeground}
        />
        <Text
          style={[
            typeScale.caption,
            { color: red ? tokens.destructive : at ? tokens.foreground : tokens.mutedForeground },
          ]}
        >
          {at ? show(at, hasTime) : title}
        </Text>
      </Chip>
    );
  };

  return (
    <View style={styles.row}>
      <Chip
        label={t("Status")}
        disabled={disabled}
        actions={TICKET_STATUSES.map((status) => ({
          id: `${STATUS}${status}`,
          title: statuses[status],
          state: status === ticket.status ? "on" : "off",
        }))}
        onSelect={(id) => {
          const value = TICKET_STATUSES.find((status) => `${STATUS}${status}` === id);
          if (value && value !== ticket.status) onChange({ status: value });
        }}
      >
        <StatusDot status={ticket.status} tokens={tokens} />
        <Text style={[typeScale.caption, { color: tokens.foreground }]}>
          {statuses[ticket.status]}
        </Text>
      </Chip>
      <Chip
        label={t("Owner")}
        disabled={disabled || bots.length === 0}
        actions={bots.map((bot) => ({
          id: `${OWNER}${bot.id}`,
          title: bot.name,
          state: bot.id === ticket.assigneeBotId ? "on" : "off",
        }))}
        onSelect={(id) => {
          const botId = id.startsWith(OWNER) ? id.slice(OWNER.length) : "";
          if (botId && botId !== ticket.assigneeBotId) onChange({ assigneeBotId: botId });
        }}
      >
        {owner ? (
          <OwnerMark bot={owner} working={false} size={20} color={tokens.foreground} />
        ) : (
          <Text style={[typeScale.caption, { color: tokens.mutedForeground }]}>{t("Owner")}</Text>
        )}
      </Chip>
      {dateChip("due", ticket.dueAt, ticket.dueHasTime)}
      {dateChip("start", ticket.startAt, ticket.startHasTime)}
      <Chip
        label={t("Priority")}
        disabled={disabled}
        actions={TICKET_PRIORITIES.map((priority) => ({
          id: `${PRIORITY}${priority}`,
          title: priorities[priority],
          state: priority === ticket.priority ? "on" : "off",
        }))}
        onSelect={(id) => {
          const value = TICKET_PRIORITIES.find((priority) => `${PRIORITY}${priority}` === id);
          if (value && value !== ticket.priority) onChange({ priority: value });
        }}
      >
        <Text
          style={[
            typeScale.caption,
            { color: ticket.priority === "normal" ? tokens.mutedForeground : tokens.foreground },
          ]}
        >
          {priorities[ticket.priority]}
        </Text>
      </Chip>
      {picking ? (
        <DatePickerSheet
          value={pickerStart(picking === "start" ? ticket.startAt : ticket.dueAt, timeZone, now)}
          onPick={(date) => onChange({ [picking]: date })}
          onClose={() => setPicking(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
  },
});
