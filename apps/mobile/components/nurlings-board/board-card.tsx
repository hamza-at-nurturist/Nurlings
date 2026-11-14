import { MenuView } from "@expo/ui/community/menu";
import { useLingui } from "@lingui/react/macro";
import type { TicketListItem, TicketStatus } from "@rakazo/contracts";
import type { TicketCard } from "@rakazo/core/nurlings-board";
import { useRef } from "react";
import type { ViewInstance } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useResolvedAppearance } from "../../lib/native";
import type { CardMenuAction } from "../../lib/nurlings-board/card-menu";
import { cardMenu, parseCardMenuAction } from "../../lib/nurlings-board/card-menu";
import { statusLabels } from "../../lib/nurlings-board/labels";
import { BoardCardFace, MoreGlyph } from "./board-card-face";
import { LONG_PRESS_MS, useBoardDrag } from "./board-drag";
import { toMenuActions } from "./shared";

/** One ticket on the board. Tap opens it, long-press drags it, ⋯ opens the native menu. */
export function BoardCard({
  card,
  status,
  onAction,
}: {
  card: TicketCard;
  status: TicketListItem["status"];
  onAction: (action: CardMenuAction) => void;
}) {
  const { t } = useLingui();
  const scheme = useResolvedAppearance();
  const drag = useBoardDrag();
  const view = useRef<ViewInstance>(null);
  const menu = cardMenu(
    { status: status as TicketStatus, canApprove: card.canApprove },
    {
      moveTo: t`Move to`,
      approve: t`Approve`,
      open: t`Open`,
      statuses: statusLabels(),
    },
  );
  // Gesture callbacks run on the JS thread: the drag logic is plain JS and the overlay position
  // is a shared value, so nothing here needs a worklet.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(drag !== null)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart((event) => {
      if (view.current)
        drag?.begin({ id: card.id, status: status as TicketStatus, card }, view.current, {
          x: event.x,
          y: event.y,
        });
    })
    .onUpdate((event) => drag?.move(event.translationX, event.translationY))
    .onFinalize((_event, success) => (success ? drag?.end() : drag?.cancel()));
  return (
    <GestureDetector gesture={pan}>
      <View
        ref={view}
        collapsable={false}
        style={drag?.liftedId === card.id ? styles.origin : undefined}
      >
        <Pressable
          testID={`board-card-${card.id}`}
          accessibilityRole="button"
          accessibilityLabel={`${card.ref}, ${card.title}`}
          onPress={() => onAction({ type: "open" })}
        >
          <BoardCardFace
            card={card}
            menu={
              <MenuView
                actions={toMenuActions(menu)}
                colorScheme={scheme}
                onPressAction={({ nativeEvent }) => {
                  const action = parseCardMenuAction(nativeEvent.event);
                  if (action) onAction(action);
                }}
              >
                <Pressable accessibilityRole="button" accessibilityLabel={t`More`}>
                  <MoreGlyph />
                </Pressable>
              </MenuView>
            }
          />
        </Pressable>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  // The slot the lifted card came from.
  origin: { opacity: 0.3 },
});
