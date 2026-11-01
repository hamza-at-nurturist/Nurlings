# Proposal

## Why

On the web board a card can be dragged to another column. On the phone it cannot: moving a card
means long-press, Move to, pick a status, which is three taps and a menu for the thing people do
most on a board. Long-press currently opens the native menu, so the natural gesture for "pick this
up" is spent on something else.

This change makes long-press pick the card up so it can be dragged to a column, as on web, and
keeps the native menu one tap away on the card.

## What Changes

- **Drag.** Long-pressing a card lifts it: a small haptic where the platform has one, a slight
  scale and shadow. Dragging moves a floating copy of the card under the finger; the card's slot
  stays in the list. Releasing over a column moves the ticket to that column's status through the
  existing `tickets/move` call, with the same instant update and rollback as the menu's Move to.
  Releasing anywhere else, or on the card's own column, snaps the card back.
- **Auto-scroll while held.** Near the left or right screen edge the column pager scrolls to the
  neighbouring column and keeps going while the finger stays there; the card then drops into
  whichever column is under it. Near the top or bottom edge the current column's list scrolls
  vertically. Speed ramps up the closer the finger is to the edge.
- **Drop highlight.** The column under the dragged card is highlighted. Only columns that are valid
  drop targets highlight; that is every column except the card's own, the same rule the web board
  applies. The rule moves into `@rakazo/core` so web and mobile call one function (see `design.md`).
- **Menu stays reachable.** The card gets a small ⋯ button that opens the same native menu
  (Move to, Approve, Open), because long-press now means drag. Tapping the card still opens the
  ticket.
- **No fighting scroll.** While a card is lifted the pager and the column list do not scroll from
  touch; only the edge auto-scroll moves them.
- **No new dependencies.** Built on `react-native-gesture-handler` and `react-native-reanimated`,
  which are already installed.

### Haptic: open question for approval

`expo-haptics` is not installed and the brief rules out new dependencies. Options:

1. **Recommended.** Lift feedback is the scale and shadow everywhere, plus a short
   `Vibration.vibrate` on Android (react-native core, no dependency). On iOS the core API only
   gives a long buzz, so iOS gets no haptic from this change.
2. Add `expo-haptics` (part of the Expo SDK already in use) so iOS gets a real light impact. This
   is a dependency add and needs your explicit yes.

I will implement option 1 unless you pick option 2.

### Proposed copy

One string, an accessible name only; nothing visible is added besides the ⋯ glyph.

| Copy | Where | Why it is needed / why not removable |
|---|---|---|
| `More` | Accessible name of the ⋯ button on a card | A glyph-only control needs a name for screen readers. Short on purpose. Not visible, so nothing to reveal later. |

The drag has no visible text: no hint, no "drop here", no empty-column prose. `More` is new to the
mobile catalog, so it is added to the five locale files under `lib/locales/nurlings-board/` (the
mobile i18n test requires every `t()` string in every catalog).

### Native-only, and what CI covers

| Part | Covered by |
|---|---|
| Drop target from position, edge-scroll speed, status validity | Unit tests (CI): core for validity, `apps/mobile/lib/nurlings-board` for geometry |
| Card renders the ⋯ button with its name; menu actions unchanged | Existing and updated mobile render tests (CI) |
| Type correctness | `pnpm --filter @rakazo/mobile check` (CI) |
| Lift, floating copy, auto-scroll feel, highlight, haptic, pager and list not fighting the gesture | Not covered. Needs a device or emulator; CI cannot capture it. Stated in the PR; tested by the maintainer on a preview build. |

### Upstream merge safety

Fork-owned folders only: `apps/mobile/components/nurlings-board/`,
`apps/mobile/lib/nurlings-board/`, `packages/core/src/nurlings-board/`. The upstream-owned file
touched is `apps/mobile/app/(nurlings)/board.tsx`, which is itself a fork-owned route; the hook is
one prop (`onMove`) passed to `BoardPages`. The web `BoardView.tsx` (fork-owned) changes one line
to call the shared validity function. Overlap with an upstream mobile board is covered in
`design.md`.

## Impact

- Capability `mobile-board`: the "Long-press a card for its actions" and "Board cards match the web
  card" requirements change; one requirement is added.
- `board-tickets` is unchanged: its "Move cards between columns" requirement already says drag and
  Move to, and the web behaviour does not change.
- Mobile app: `nurlings-board` components, one prop in `board.tsx`, one string in five locale files.
- `@rakazo/core`: one small pure function next to `boardColumns`.
- No API, contract, schema or migration change. Contacts no Rakazo-owned infrastructure.

## Ordering note

The `mobile-board` change (PR merged) is not archived yet, so `mobile-board` is not in
`openspec/specs/` and the modified requirements below only resolve once it is archived. Archive
`mobile-board` before applying or archiving this change; if you would rather not wait, this delta
can be reworded as ADDED requirements with the old ones removed in the same step.
