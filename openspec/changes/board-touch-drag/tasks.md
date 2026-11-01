# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and `design.md`, including the haptic choice (Android
  `Vibration` only, or add `expo-haptics`). Verify: explicit approval in the session. No code
  before this.
- [ ] 1.2 Confirm the `mobile-board` change is archived first (the modified requirements resolve
  against it). Verify: `openspec/specs/mobile-board/spec.md` exists on `main`, or the maintainer
  chooses the reworded delta.

## 2. Shared rule

- [ ] 2.1 Add `isMoveTarget(from, to)` to `packages/core/src/nurlings-board/columns.ts`, use it in
  the web `move()` and in mobile `board.tsx` `onAction`. Verify: new cases in `columns.test.ts`
  for all status pairs; web `BoardView.test.tsx` passes untouched; `pnpm --filter @rakazo/web
  check` and `pnpm --filter @rakazo/mobile check` pass.

## 3. Geometry

- [ ] 3.1 Add `apps/mobile/lib/nurlings-board/drag.ts` with `columnAt`, `edgeScrollSpeed` and
  `snapOffset`. Verify: `drag.test.ts` covering inside, gaps, padding, past ends, scrolled
  offsets, zero outside the zone, monotonic ramp, cap, sign, clamp.

## 4. Card

- [ ] 4.1 Split `BoardCardBody` out of `BoardCard`; wrap only a ⋯ button in `MenuView` (tap opens,
  no long-press), accessible name `More` through `t()`; keep tap-to-open on the card. Verify:
  `board-column.test.tsx` updated for the button and its name, menu actions and tap-to-open
  unchanged.
- [ ] 4.2 Add `More` to the five `lib/locales/nurlings-board/*.ts` files. Verify: the mobile
  i18n test passes.

## 5. Drag layer

- [ ] 5.1 Add the drag store (shared values: dragged ticket, finger x/y, grab offset, hovered
  index) and the long-press pan on each card, lifting with scale and shadow. Verify: `tsc`
  passes; on a device the card lifts after the hold and a quick tap still opens the ticket.
- [ ] 5.2 Render the floating copy overlay in `BoardPages`; leave the origin slot dimmed. Verify:
  on a device the copy follows the finger and the list does not re-render while moving.
- [ ] 5.3 Haptic per the approved choice; confirm whether Android declares `VIBRATE`, and if it
  does not, drop the vibration instead of editing the manifest. Verify: on an Android device
  there is a short buzz on lift, or the PR says why there is none.
- [ ] 5.4 Disable pager and column list scrolling while a card is lifted. Verify: on a device
  neither scrolls from touch during a drag.

## 6. Auto-scroll, highlight, drop

- [ ] 6.1 Frame-driven edge auto-scroll: horizontal on the pager (snap to nearest page on
  release), vertical on the column under the finger, speed from `edgeScrollSpeed`. Verify:
  on a device, holding at each edge scrolls and speeds up nearer the edge; stops on release.
- [ ] 6.2 Highlight the hovered valid column using the muted token. Verify: on a device the
  column under the card highlights, its own column does not.
- [ ] 6.3 On release call `onAction(ticket, { type: "move", status })` for a valid hovered
  column, otherwise snap back. Verify: on a device a drop moves the card at once; with the
  network off the card returns and the error shows; a drop on its own column or between columns
  changes nothing.

## 7. Pull request

- [ ] 7.1 Open the PR from `feature/board-touch-drag` with Why, What and How tested in words,
  the proposed copy quoted (`More`, accessible name only), and a note that the drag UI is
  native-only and CI cannot capture it. Verify: PR description reviewed against `AGENTS.md`.
- [ ] 7.2 Stay with the PR until CI is terminal and review comments are handled
  (`pr-watch`); do not merge. Verify: checks on the head commit are green or each failure is
  explained and fixed.

## 8. After merge

- [ ] 8.1 Archive the change. Verify: `openspec archive board-touch-drag` and the main
  `mobile-board` spec shows the drag requirements.
