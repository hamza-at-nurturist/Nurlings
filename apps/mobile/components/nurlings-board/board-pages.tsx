import type { Bot, TicketListItem, TicketStatus } from "@rakazo/contracts";
import type { BoardColumn as BoardColumnData } from "@rakazo/core/nurlings-board";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import type { FlatList as FlatListType, ViewInstance } from "react-native";
import { FlatList, StyleSheet, useWindowDimensions, View } from "react-native";
import type { CardMenuAction } from "../../lib/nurlings-board/card-menu";
import { BoardColumn } from "./board-column";
import { BoardDragProvider, useBoardDrag } from "./board-drag";

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

/** The columns as horizontally paged lists, one per page, snapping page to page. A card can be
 * long-pressed and dragged between them. */
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
  const container = useRef<ViewInstance>(null);
  const offset = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const layout = { pageWidth: width, gap: GAP, edge: EDGE, count: columns.length };
  // A drop is the card menu's Move to: the same call, optimistic update and rollback.
  const drop = (ticketId: string, status: TicketStatus) => {
    for (const column of columns) {
      const ticket = [...column.tickets, ...column.older].find((row) => row.id === ticketId);
      if (ticket) return onAction(ticket, { type: "move", status });
    }
  };
  return (
    <View
      ref={container}
      collapsable={false}
      style={styles.board}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      <BoardDragProvider
        columns={columns}
        layout={layout}
        size={size}
        container={container}
        pager={list}
        pagerOffset={offset}
        onDrop={drop}
      >
        <Pager
          columns={columns}
          bots={bots}
          timeZone={timeZone}
          width={width}
          bottomInset={bottomInset}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onAction={onAction}
          list={list}
          offset={offset}
        />
      </BoardDragProvider>
    </View>
  );
}

function Pager({
  columns,
  bots,
  timeZone,
  width,
  bottomInset,
  refreshing,
  onRefresh,
  onAction,
  list,
  offset,
}: {
  columns: BoardColumnData[];
  bots: Bot[];
  timeZone: string;
  width: number;
  bottomInset: number;
  refreshing: boolean;
  onRefresh: () => void;
  onAction: (ticket: TicketListItem, action: CardMenuAction) => void;
  list: RefObject<FlatListType<BoardColumnData> | null>;
  offset: RefObject<number>;
}) {
  const drag = useBoardDrag();
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
  }, [hasCards, target, width, list]);
  return (
    <FlatList
      ref={list}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      // While a card is held only the edge auto-scroll moves the pager.
      scrollEnabled={!drag?.locked}
      onScroll={(event) => {
        if (!drag?.locked) offset.current = event.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={16}
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
      renderItem={({ item, index }) => (
        <BoardColumn
          status={item.status}
          index={index}
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
  board: { flex: 1 },
  content: { paddingHorizontal: EDGE },
  gap: { width: GAP },
});
