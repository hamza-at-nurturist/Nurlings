import type { TicketStatus } from "@rakazo/contracts";
import type { TicketCard } from "@rakazo/core/nurlings-board";
import { isMoveTarget } from "@rakazo/core/nurlings-board";
import * as Haptics from "expo-haptics";
import type { ReactNode, RefObject } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  FlatList as FlatListType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ViewInstance,
} from "react-native";
import { StyleSheet } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import type { PagerLayout } from "../../lib/nurlings-board/drag";
import {
  columnAt,
  edgeScrollSpeed,
  maxPagerOffset,
  snapOffset,
} from "../../lib/nurlings-board/drag";
import { BoardCardFace, MoreGlyph } from "./board-card-face";

/** How long a card is held before it lifts. */
export const LONG_PRESS_MS = 350;
/** Distance from the board's edges where auto-scroll starts, and its top speed in pixels a frame. */
const ZONE_X = 56;
const ZONE_Y = 72;
const MAX_SPEED_X = 18;
const MAX_SPEED_Y = 14;
const LIFT_SCALE = 1.04;
const SNAP_BACK_MS = 160;

type Lifted = { id: string; status: TicketStatus; card: TicketCard; width: number; height: number };
type Point = { x: number; y: number };
type Scrollable = { scrollToOffset: (params: { offset: number; animated: boolean }) => void };

export type BoardDrag = {
  /** The card being dragged, so its slot can show it has left. */
  liftedId: string | null;
  /** True from the moment a hold completes until the drag ends: scroll views stay still. */
  locked: boolean;
  /** The column index under the card when it is a valid target, otherwise -1. */
  hover: SharedValue<number>;
  begin: (
    item: { id: string; status: TicketStatus; card: TicketCard },
    view: ViewInstance,
    grab: Point,
  ) => void;
  move: (dx: number, dy: number) => void;
  end: () => void;
  cancel: () => void;
};

const Context = createContext<BoardDrag | null>(null);
const ColumnScrolls = createContext<Map<number, (dy: number) => void> | null>(null);

/** The drag the board provides to its cards and columns; null outside a board. */
export function useBoardDrag(): BoardDrag | null {
  return useContext(Context);
}

function measure(
  view: ViewInstance,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return new Promise((resolve) =>
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height })),
  );
}

function tap(style: Haptics.ImpactFeedbackStyle) {
  void Haptics.impactAsync(style).catch(() => undefined);
}

/** Owns one drag: lifts a card, follows the finger, scrolls at the edges, drops on a column. */
export function BoardDragProvider({
  columns,
  layout,
  size,
  container,
  pager,
  pagerOffset,
  onDrop,
  children,
}: {
  columns: readonly { status: TicketStatus }[];
  layout: PagerLayout;
  /** The board's width and height: the edges auto-scroll reacts to. */
  size: { width: number; height: number };
  container: RefObject<ViewInstance | null>;
  pager: RefObject<Scrollable | null>;
  /** The pager's live scroll offset, kept up to date by the board. */
  pagerOffset: RefObject<number>;
  onDrop: (ticketId: string, status: TicketStatus) => void;
  children: ReactNode;
}) {
  const [lifted, setLifted] = useState<Lifted | null>(null);
  const [locked, setLocked] = useState(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const hover = useSharedValue(-1);
  const columnScrolls = useRef(new Map<number, (dy: number) => void>()).current;

  // Everything a drag reads while it runs lives in refs, so the callbacks never go stale.
  const current = useRef<Lifted | null>(null);
  const holding = useRef(false);
  const start = useRef<Point>({ x: 0, y: 0 });
  const grabbed = useRef<Point>({ x: 0, y: 0 });
  const moved = useRef<Point>({ x: 0, y: 0 });
  const finger = useRef<Point>({ x: 0, y: 0 });
  const hovered = useRef(-1);
  const frame = useRef<number | null>(null);
  const latest = useRef({ columns, layout, size, onDrop });
  latest.current = { columns, layout, size, onDrop };

  const stopTicking = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  useEffect(() => stopTicking, [stopTicking]);

  const place = useCallback(() => {
    const left = start.current.x + moved.current.x;
    const top = start.current.y + moved.current.y;
    x.value = left;
    y.value = top;
    finger.current = { x: left + grabbed.current.x, y: top + grabbed.current.y };
  }, [x, y]);

  const updateHover = useCallback(() => {
    const item = current.current;
    const { columns: list, layout: pages } = latest.current;
    const index = columnAt(finger.current.x, pagerOffset.current ?? 0, pages);
    const valid =
      item && index !== null && list[index] && isMoveTarget(item.status, list[index].status);
    const next = valid && index !== null ? index : -1;
    if (next !== hovered.current) {
      hovered.current = next;
      hover.value = next;
    }
  }, [hover, pagerOffset]);

  const tick = useCallback(() => {
    frame.current = requestAnimationFrame(tick);
    const { layout: pages, size: board } = latest.current;
    const offset = pagerOffset.current ?? 0;
    const sideways = edgeScrollSpeed(finger.current.x, board.width, ZONE_X, MAX_SPEED_X);
    if (sideways) {
      const next = Math.min(Math.max(offset + sideways, 0), maxPagerOffset(board.width, pages));
      if (next !== offset) {
        pagerOffset.current = next;
        pager.current?.scrollToOffset({ offset: next, animated: false });
      }
    }
    const vertical = edgeScrollSpeed(finger.current.y, board.height, ZONE_Y, MAX_SPEED_Y);
    if (vertical) {
      const index = columnAt(finger.current.x, pagerOffset.current ?? 0, pages);
      if (index !== null) columnScrolls.get(index)?.(vertical);
    }
    updateHover();
  }, [columnScrolls, pager, pagerOffset, updateHover]);

  const finish = useCallback(() => {
    stopTicking();
    holding.current = false;
    current.current = null;
    hovered.current = -1;
    hover.value = -1;
    setLifted(null);
    setLocked(false);
  }, [hover, stopTicking]);

  const begin = useCallback<BoardDrag["begin"]>(
    (item, view, grab) => {
      if (holding.current) return;
      holding.current = true;
      setLocked(true);
      moved.current = { x: 0, y: 0 };
      grabbed.current = grab;
      void Promise.all([measure(view), container.current ? measure(container.current) : null]).then(
        ([card, board]) => {
          if (!holding.current) return;
          start.current = { x: card.x - (board?.x ?? 0), y: card.y - (board?.y ?? 0) };
          const lift = { ...item, width: card.width, height: card.height };
          current.current = lift;
          place();
          setLifted(lift);
          tap(Haptics.ImpactFeedbackStyle.Light);
          frame.current = requestAnimationFrame(tick);
        },
      );
    },
    [container, place, tick],
  );

  const move = useCallback<BoardDrag["move"]>(
    (dx, dy) => {
      moved.current = { x: dx, y: dy };
      if (current.current) {
        place();
        updateHover();
      }
    },
    [place, updateHover],
  );

  const end = useCallback(() => {
    const item = current.current;
    const status = hovered.current >= 0 ? latest.current.columns[hovered.current]?.status : null;
    if (item && status) {
      tap(Haptics.ImpactFeedbackStyle.Light);
      finish();
      latest.current.onDrop(item.id, status);
    } else if (item) {
      // Nowhere to drop: the copy slides back to its slot before it goes.
      stopTicking();
      hover.value = -1;
      x.value = start.current.x;
      y.value = start.current.y;
      setTimeout(finish, SNAP_BACK_MS);
    } else {
      finish();
    }
    // Settle on the nearest column; scrolling is allowed again once the drag is over.
    const { layout: pages } = latest.current;
    const offset = snapOffset(pagerOffset.current ?? 0, pages);
    pagerOffset.current = offset;
    pager.current?.scrollToOffset({ offset, animated: true });
  }, [finish, hover, pager, pagerOffset, stopTicking, x, y]);

  const cancel = useCallback(() => {
    if (holding.current) finish();
  }, [finish]);

  const value = useMemo<BoardDrag>(
    () => ({ liftedId: lifted?.id ?? null, locked, hover, begin, move, end, cancel }),
    [lifted?.id, locked, hover, begin, move, end, cancel],
  );
  return (
    <Context.Provider value={value}>
      <ColumnScrolls.Provider value={columnScrolls}>
        {children}
        {lifted ? <Overlay lifted={lifted} x={x} y={y} /> : null}
      </ColumnScrolls.Provider>
    </Context.Provider>
  );
}

/** The floating copy of the card, scaled up with a shadow, following the finger. */
function Overlay({
  lifted,
  x,
  y,
}: {
  lifted: Lifted;
  x: SharedValue<number>;
  y: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: LIFT_SCALE }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { width: lifted.width }, style]}>
      <BoardCardFace card={lifted.card} menu={<MoreGlyph />} />
    </Animated.View>
  );
}

/** A tint over the column page while a card hovers over it as a valid target. */
export function ColumnHighlight({ index, color }: { index: number; color: string }) {
  const drag = useBoardDrag();
  if (!drag) return null;
  return <Tint hover={drag.hover} index={index} color={color} />;
}

function Tint({
  hover,
  index,
  color,
}: {
  hover: SharedValue<number>;
  index: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({ opacity: hover.value === index ? 1 : 0 }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: color }, style]}
    />
  );
}

/** What a column list needs to take part in a drag: stay still while one is held, and be scrolled
 * a little at a time when the finger sits at its top or bottom edge. */
export function useColumnScroll<Item>(index: number) {
  const drag = useBoardDrag();
  const scrolls = useContext(ColumnScrolls);
  const list = useRef<FlatListType<Item>>(null);
  const offset = useRef(0);
  const extent = useRef({ content: 0, view: 0 });
  useEffect(() => {
    if (!scrolls) return;
    scrolls.set(index, (dy) => {
      const max = Math.max(0, extent.current.content - extent.current.view);
      const next = Math.min(Math.max(offset.current + dy, 0), max);
      if (next === offset.current) return;
      offset.current = next;
      list.current?.scrollToOffset({ offset: next, animated: false });
    });
    return () => void scrolls.delete(index);
  }, [scrolls, index]);
  return {
    ref: list,
    scrollEnabled: !drag?.locked,
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!drag?.locked) offset.current = event.nativeEvent.contentOffset.y;
    },
    onContentSizeChange: (_width: number, height: number) => {
      extent.current.content = height;
    },
    onLayout: (event: { nativeEvent: { layout: { height: number } } }) => {
      extent.current.view = event.nativeEvent.layout.height;
    },
    scrollEventThrottle: 16,
  };
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
});
