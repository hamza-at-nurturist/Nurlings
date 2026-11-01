# Proposal

## Why

Two layout bugs on the native Board:

- The Nurling filter row sits in a column above the pages. A horizontal `ScrollView` defaults to
  `flexGrow: 1` there, so the row grows vertically and leaves a tall gap between the filter and
  the columns.
- Long text on a card (a long title word, long dates, owner names) can run past the card's edge
  instead of wrapping or shrinking, because its text nodes are not allowed to shrink inside their
  rows.

## What Changes

- The filter `ScrollView` stops growing (`flexGrow: 0`), so the columns start right under the row.
- Card text may shrink and wrap inside its row: the title, the dates line and the footer rows get
  `flexShrink: 1` / `minWidth: 0`, and the card itself is full width of its slot.
- No copy, behaviour, contract or dependency change.

Bug fix: proposal and tasks only, no spec delta (the layout is not a requirement).

## Impact

Two files in the fork-owned `apps/mobile/components/nurlings-board/` folder. Native layout, so CI
cannot capture it; checked by type-check and tests, and visually by the maintainer on a preview
build.
