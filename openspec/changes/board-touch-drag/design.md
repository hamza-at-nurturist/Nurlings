# Design

## What the web board does (the rule to reuse)

Web drops call `move(ticket, column.status)` in `BoardView.tsx`, which returns early when the
status is unchanged and otherwise updates the row at once and calls `tickets.move`; the reload
after the call puts the card back if the server refused. No other status pair is refused on the
client, and the server accepts any status. So "the columns the web board allows" is every column
except the card's own. Mobile's `board.tsx` has its own copy of the unchanged check
(`action.status !== ticket.status`).

## Decisions

### 1. One validity rule in core

`isMoveTarget(from: TicketStatus, to: TicketStatus): boolean` goes in
`packages/core/src/nurlings-board/columns.ts` next to `boardColumns`. Web `move()`, mobile
`board.tsx` `onAction` and the new drag code all call it, so the day the rule grows (say Done can
only be reached through Approve) it changes in one place. Web gets a one-line edit in
`BoardView.tsx`; behaviour does not change.

### 2. A drop is just a menu "Move to"

BoardPages already receives `onAction(ticket, action)`. A drop calls
`onAction(ticket, { type: "move", status })`, the exact call the menu makes, so the optimistic
update, `tickets/move` and rollback are the existing code and are not forked. `board.tsx` changes
only to use `isMoveTarget` in the move branch.

### 3. Gesture: long-press then pan, per card

Each card gets `Gesture.Pan().activateAfterLongPress(~350ms)` inside the root's existing
`GestureHandlerRootView` (`_layout.tsx` already mounts it). Before the long-press completes, a
vertical or horizontal swipe fails the gesture and the lists scroll normally; after it, the pan
owns the touch. On activation the card reports itself as dragged (ticket, measured size, where in
the card the finger grabbed it) to a small drag store, and `BoardPages` sets `scrollEnabled=false`
on the pager and every column list, so touch scrolling cannot compete; only auto-scroll moves
them. The existing tap (`Pressable onPress`) is untouched: a quick tap never reaches the
long-press threshold.

The native menu moves off the card body onto the ⋯ button: `MenuView` wraps only that button and
drops `shouldOpenOnLongPress`, so a tap on ⋯ opens the same menu. The accessible name is `More`.
Drag is a touch accelerator; the menu is the accessible route for Move to, as the keyboard menu is
on web.

### 4. Floating copy

`BoardPages` renders one absolutely positioned overlay above the pager (`pointerEvents="none"`)
that shows the dragged card at `finger - grabOffset`, scaled to ~1.04 with a shadow. The card body
is split out of `BoardCard` into a presentational `BoardCardBody` that both the list item and the
overlay render, so the copy cannot drift from the card. The list item stays in place at reduced
opacity as the slot the card came from. Position lives in Reanimated shared values updated on the
UI thread; no React renders while moving.

### 5. Where is the finger: pure geometry

`apps/mobile/lib/nurlings-board/drag.ts`, pure and worklet-safe:

- `columnAt(x, scrollX, layout)`: column index under screen x, given the pager's scroll offset,
  page width, gap and side padding; `null` in the gaps, the padding and past the last column.
- `edgeScrollSpeed(position, size, zone, maxSpeed)`: signed pixels per frame, `0` outside the edge
  zone, growing smoothly from the zone's inner boundary to `maxSpeed` at the edge and clamped
  beyond it; negative toward the start.
- `snapOffset(scrollX, layout)`: nearest page offset, used when the drag ends so the pager does
  not stop between pages.

The hovered column is `columnAt(...)`, kept only if `isMoveTarget(dragged.status, thatStatus)`.
The same value drives the highlight and the drop.

### 6. Auto-scroll

A `useFrameCallback` runs only while a card is lifted. Each frame it computes horizontal speed from
the finger's x against the screen width and scrolls the pager with Reanimated `scrollTo` on an
animated ref (the pager becomes `Animated.FlatList`). Vertical speed from y against the window
height scrolls the column under the finger; the vertical step goes to that column's list through
`runOnJS` only on frames where the speed is non-zero, since lists are ordinary JS refs. Scroll
offsets are tracked through `onScroll`. On release the pager animates to `snapOffset`.

### 7. Highlight

Each `BoardColumn` takes its index and the shared `hoverIndex`; an animated style tints its
background with the muted token when `hoverIndex === index`. Invalid targets never become
`hoverIndex`, so they never highlight. No new colour: shared semantic tokens only.

### 8. Haptic

`expo-haptics`: `impactAsync(Light)` when the card lifts and when a valid drop lands, called from
the JS side of the gesture callbacks. The module declares `VIBRATE` in its own Android manifest,
so no app manifest or config-plugin edit is needed. A failed haptic call is ignored. Adding a
native module means the next preview APK must be a native build, not an update.

## Upstream overlap

- **Upstream mobile board.** If a sync brings an upstream mobile board, the existing
  `mobile-board` change's rule applies: pick keep-ours or adopt-theirs at that sync. Drag is
  isolated in `drag.ts`, a drag store and the card/pages components, so porting it onto an
  upstream board is a localized job.
- **Upstream drag on mobile.** If upstream ships its own, delete our gesture and overlay and keep
  `isMoveTarget` in core, which web uses too.
- **Shared libraries.** `react-native-gesture-handler` and `react-native-reanimated` are upstream
  dependencies already used by `_layout.tsx` and the inbox swipe row; version bumps there can
  change gesture details, which is the main merge-risk for this feature.
- **Core and web.** `columns.ts` gains one export; `BoardView.tsx` gains one call. Both are
  fork-owned files.

## Risks

- **Gesture competition with native scroll views** differs between iOS and Android. Mitigated by
  disabling both scrolls on activation and by `activateAfterLongPress` failing early on
  movement; the actual feel can only be judged on a device (CI cannot, and the PR says so).
- **Auto-scroll and the hovered column drift.** The hovered column is recomputed every frame from
  the live offset, not cached, so scrolling under a still finger updates it.
- **Window size changes** (rotation, iPad split view): `columnAt` and the zones take the live
  width, nothing is cached.
- **Long-press changes meaning.** Users used to long-press for the menu now start a drag; the ⋯
  button is the way to the menu and release without moving is a no-op.

## Tests

- **Core (Vitest):** `isMoveTarget` for every status pair; same status is false, every other is
  true.
- **Mobile lib (Vitest):** `columnAt` (inside, gaps, padding, past ends, scrolled offsets, other
  page widths), `edgeScrollSpeed` (outside the zone is zero, ramps monotonically, caps at
  `maxSpeed`, negative toward start, clamps past the edge), `snapOffset`.
- **Mobile render (existing file):** the card renders the ⋯ button with its name and still opens
  the ticket on press; the menu actions are unchanged.
- **Not tested here:** the gesture, overlay, auto-scroll feel and haptic, which need a device.
