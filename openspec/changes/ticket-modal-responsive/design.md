# Design

## Layout

`apps/web/src/components/board/TicketModal/`:

| File | Role |
|---|---|
| `TicketModal.tsx` | Keeps state, saving and drag-drop; renders `WideTicket` or `NarrowTicket` from `useNarrowModal()` |
| `NarrowTicket.tsx` (new) | Full-screen sheet: header, `Tabs`, swipe, pinned Approve and reply box |
| `TicketPane.tsx` (new) | Title, properties, description and files, shared by both layouts (lifted out of `TicketModal.tsx`) |
| `LatestActivity.tsx` (new) | The one-line newest-comment row |
| `ClampedDescription.tsx` (new) | Three-line clamp, `Show more`, tap to edit |
| `TicketImage.tsx` (new) | Square thumbnail via `useArtifactImage` and the full-screen viewer `Dialog` |
| `use-narrow-modal.ts` (new) | `matchMedia("(max-width: 1023px)")` through `useSyncExternalStore`; false where `matchMedia` is missing (jsdom) |
| `use-swipe.ts` (new) | Horizontal swipe on touch: 60px and twice the vertical travel; ignored when it starts in a field |
| `use-visual-viewport.ts` (new) | The visual viewport's height and top offset, for the keyboard |
| `activity-seen.ts` (new) | Last-viewed per ticket in `localStorage`, pruned; pure `unseenCount(items, seenAt, viewerId)` |
| `Properties.tsx` | Gains `layout: "grid" \| "chips"`; same menus, chip triggers and menu rows 44px |
| `DatePicker.tsx` | Gains `chip`: the 44px pill, naming itself ("Start", "Due") while empty |
| `chip.ts` (new) | The chip class both share |
| `use-ticket-activity.ts` | Also returns `loaded`, so the new-activity count waits for the first fetch |
| `TicketFiles.tsx` | Splits images (`image/png`, `image/jpeg`, `image/gif`, `image/webp`) into the thumbnail grid; `narrow` makes other cards full width |
| `TicketFileCard.tsx` | Accepts a `className` for full width |
| `ReplyBox.tsx` | Gains `touch`: 16px text, 44px attach and send |

`ActivityFeed.tsx`, `activity.ts` and `mentions` are unchanged. Tests sit next to each
file.

## Decisions

### 1. Window width, not a container query

The dialog is portalled to `body` and either centred at a max width or full screen, so the window
width decides how much room it has. The two layouts are different trees (tabs vs. panes), so a CSS
container query can't switch them alone; a `matchMedia` hook can, and re-renders on resize or
rotate. Breakpoint 1024px (`lg`), see the proposal.

### 2. One sheet, the same `Dialog`

Narrow uses the same `Dialog`/`DialogContent` with the full-screen classes `fullscreen` already uses
(`h-dvh max-w-none rounded-none`), `showCloseButton={false}`, and its own header. Focus trap,
Escape and the overlay behave as today. The fullscreen preference is ignored on narrow.

### 3. Both tab panels stay mounted

`TabsContent keepMounted`, inactive one hidden. Switching tabs keeps the reply draft, staged files,
mention chips, an open description edit and the feed's scroll. Opening Activity scrolls its
container to the bottom in `TicketModal`, so `ActivityFeed` needs no new prop. The feed list sits
in a `flex min-h-full flex-col justify-end` wrapper so a short feed hugs the reply box.

### 4. Keyboard

`h-dvh` doesn't shrink for the iOS keyboard. The sheet sets its height and top from
`window.visualViewport` (`height`, `offsetTop`) while it is open, falling back to `100dvh` when
the API is missing. The reply box is the last flex child, so it rides on top of the keyboard. No
viewport meta change.

### 5. Swipe

Touch events on the tab content, not pointer events, so mouse drags and text selection on desktop
never switch. Left goes to Activity, right to Ticket. A start inside `input`, `textarea` or
`[contenteditable]` is ignored. Base UI `Tabs` has no swipe of its own.

### 6. New-activity count

There is no server read-state for tickets and adding one is out of scope. `activity-seen.ts`
stores `{ [ticketId]: newestSeenAt }` under one key, keeps the 200 most recently written tickets,
and falls back to memory. Unseen = shown feed rows (comments, events with a line, files, failures)
newer than `seenAt` whose actor isn't the viewer. A ticket with no record is marked seen on first
open, so old tickets don't light up. Marked seen: on wide while open, on narrow while Activity is
the active tab, each time the newest item changes.

### 7. Images

`TicketImage` reuses `useArtifactImage` (shared download cache) and the chat viewer's pattern
(`Dialog`, `object-contain`), full screen on every width. The thumbnail is a `button` named after
the file; before the bytes load it shows the file's name on `bg-muted`. Loading is lazy with the
same `IntersectionObserver` pattern as `ArtifactImage`. Upstream's `ArtifactImage` is not reused
directly: its size and shape are fixed for chat and changing it would touch an upstream file.

### 8. Description clamp

`line-clamp-3` on a read view; `Show more` appears only when `scrollHeight > clientHeight`
(checked on mount and on resize). Tapping the text swaps in the existing `Textarea`, focused, and
blur saves as today. Desktop keeps the always-on textarea.

### 9. Tests

- Unit: `use-swipe`, `activity-seen` (count, own items excluded, prune, blocked storage),
  `NarrowTicket` (tabs, header text per tab, back closes, Approve pinned only in review, latest
  activity opens Activity, count clears, reply draft survives a tab switch), `TicketFiles` (images
  in the grid, viewer opens), `ClampedDescription`. `matchMedia` mocked per test.
- E2E (`apps/web/e2e/ticket-mobile.spec.ts`, 390×844): open a ticket, check the chips, switch to
  Activity by tab and back by swipe, reply, see the comment; screenshots `ticket-phone-ticket` and
  `ticket-phone-activity`. The existing desktop board e2e keeps covering wide.
