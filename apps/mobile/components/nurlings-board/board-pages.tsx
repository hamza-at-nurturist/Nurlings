import type { Bot, TicketListItem } from "@rakazo/contracts";
import type { BoardColumn as BoardColumnData } from "@rakazo/core/nurlings-board";
import { useEffect, useRef, useState } from "react";
import type { FlatList as FlatListType } from "react-native";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import type { CardMenuAction } from "../../lib/nurlings-board/card-menu";
import { BoardColumn } from "./board-column";

const GAP = 10;
const EDGE = 16;
/** A page this wide on a phone leaves the next column peeking in. */
const PAGE_FRACTION = 0.84;
const MAX_PAGE = 380;

export function pageWidth(windowWidth: number): number {
  return Math.min(Math.round(windowWidth * PAGE_FRACTION), MAX_PAGE);
}

/** The first column with a card, so the board never opens on an empty page. */
export function firstFilledColumn(columns: readonly BoardColumnData[]): number {
  const index = columns.findIndex((column) => column.tickets.length + column.older.length > 0);
  return Math.max(0, index);
}

/** The columns as horizontally paged lists, one per page, snapping page to page. */
export function BoardPages({
  columns,
  bots,
  timeZone,
  bottomInset,
  refreshing,
  onRefresh,
  onAction,
}: {
  columns: BoardColumnData[];
  bots: Bot[];
  timeZone: string;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
  onAction: (ticket: TicketListItem, action: CardMenuAction) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const width = pageWidth(windowWidth);
  const list = useRef<FlatListType<BoardColumnData>>(null);
  const [showOlder, setShowOlder] = useState(false);
  const [height, setHeight] = useState(0);
  const opened = useRef(false);
  const target = firstFilledColumn(columns);
  const hasCards = columns.some((column) => column.tickets.length + column.older.length > 0);
  // Opens on the first filled column once, when the first cards arrive; after that the user's
  // own scrolling is left alone.
  useEffect(() => {
    if (opened.current || !hasCards) return;
    opened.current = true;
    if (target > 0)
      list.current?.scrollToOffset({ offset: target * (width + GAP), animated: false });
  }, [hasCards, target, width]);
  return (
    <FlatList
      ref={list}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      horizontal
      data={columns}
      keyExtractor={(column) => column.status}
      snapToInterval={width + GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      disableIntervalMomentum
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      ItemSeparatorComponent={Gap}
      getItemLayout={(_, index) => ({ length: width + GAP, offset: (width + GAP) * index, index })}
      renderItem={({ item }) => (
        <BoardColumn
          status={item.status}
          tickets={item.tickets}
          older={item.older}
          showOlder={showOlder}
          onShowOlder={() => setShowOlder(true)}
          bots={bots}
          timeZone={timeZone}
          width={width}
          height={height}
          bottomInset={bottomInset}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onAction={onAction}
        />
      )}
    />
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: EDGE },
  gap: { width: GAP },
});
