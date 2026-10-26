import type { Bot, TicketListItem, TicketStatus } from "@rakazo/contracts";
import { WORKING_RUN_STATUSES } from "@rakazo/core";
import { boardColumns } from "@rakazo/core/nurlings-board";
import { typeScale } from "@rakazo/ui-tokens";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { glassHeaderOptions } from "../../components/glass-title";
import { BoardPages } from "../../components/nurlings-board/board-pages";
import { NurlingFilter } from "../../components/nurlings-board/nurling-filter";
import { QuickAdd } from "../../components/nurlings-board/quick-add";
import { rpc } from "../../lib/api";
import { useFloatingHeaderInset, useHeaderHeightIfAny } from "../../lib/floating-header";
import { useI18n } from "../../lib/i18n";
import { useMobileTokens } from "../../lib/native";
import { iosAtLeast } from "../../lib/native-controls";
import type { CardMenuAction } from "../../lib/nurlings-board/card-menu";
import { useNurlingsBoardEnabled } from "../../lib/nurlings-board/enabled";
import {
  useBoardBots,
  useBoardMe,
  useBoardStream,
  useRevisions,
} from "../../lib/nurlings-board/live";
import { errorText } from "../../lib/user-error";

/** The Board: a Nurling filter, six paged columns of live cards, and quick-add. */
export default function BoardScreen() {
  const { t } = useI18n();
  const tokens = useMobileTokens();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const topInset = useFloatingHeaderInset();
  const headerHeight = useHeaderHeightIfAny();
  const enabled = useNurlingsBoardEnabled();
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [owner, setOwner] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const revisions = useRevisions();
  const bots: Bot[] = useBoardBots(revisions.get());
  const { timeZone } = useBoardMe();

  useLayoutEffect(() => {
    navigation.setOptions(glassHeaderOptions(t("Board")));
  }, [navigation, t]);

  // A board that is off, or a link into one, goes home without showing anything.
  useEffect(() => {
    if (enabled === false) router.replace("/");
  }, [enabled, router]);

  const reload = useCallback(async () => {
    const result = await rpc<{ tickets: TicketListItem[] }>("tickets/list", {});
    setTickets(result.tickets);
  }, []);

  useEffect(() => {
    if (enabled) void reload().catch((cause) => setError(errorText(cause)));
  }, [enabled, reload]);

  useBoardStream({
    onOpen: () => {
      revisions.bump();
      void reload().then(
        () => setError(""),
        (cause) => setError(errorText(cause)),
      );
    },
    onChange: (event) => {
      revisions.bump(event.ticketId);
      void reload().catch(() => undefined);
    },
    onError: (cause) => setError(errorText(cause)),
  });

  // A run can finish without changing its ticket, so a change in who is working reloads the cards.
  const working = bots
    .filter((bot) => WORKING_RUN_STATUSES.some((status) => status === bot.status))
    .map((bot) => bot.id)
    .join(",");
  useEffect(() => {
    if (bots.length) void reload().catch(() => undefined);
  }, [working]);

  const columns = useMemo(() => boardColumns(tickets, owner, new Date()), [tickets, owner]);

  async function act(change: () => Promise<unknown>) {
    setError("");
    try {
      await change();
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      await reload().catch(() => undefined);
    }
  }

  function onAction(ticket: TicketListItem, action: CardMenuAction) {
    if (action.type === "open") {
      router.push({ pathname: "/ticket", params: { ticketId: ticket.id } });
    } else if (action.type === "approve") {
      void act(() => rpc("tickets/approve", { id: ticket.id }));
    } else if (action.status !== ticket.status) {
      const status: TicketStatus = action.status;
      // Shown now; the reload after the call puts the card back if the server refused.
      setTickets((rows) => rows.map((row) => (row.id === ticket.id ? { ...row, status } : row)));
      void act(() => rpc("tickets/move", { id: ticket.id, status }));
    }
  }

  if (enabled !== true) return <View style={{ flex: 1, backgroundColor: tokens.background }} />;

  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={iosAtLeast(26) ? 0 : headerHeight}
      style={{ flex: 1, backgroundColor: tokens.background, paddingTop: topInset }}
    >
      <NurlingFilter bots={bots} value={owner} onChange={setOwner} />
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[
            typeScale.caption,
            { color: tokens.destructive, paddingHorizontal: 16, paddingVertical: 6 },
          ]}
        >
          {error}
        </Text>
      ) : null}
      <View style={{ flex: 1 }}>
        <BoardPages
          columns={columns}
          bots={bots}
          timeZone={timeZone}
          bottomInset={12}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void reload()
              .catch((cause) => setError(errorText(cause)))
              .finally(() => setRefreshing(false));
          }}
          onAction={onAction}
        />
      </View>
      <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <QuickAdd
          bots={bots}
          onCreated={() => void reload().catch(() => undefined)}
          onError={setError}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
