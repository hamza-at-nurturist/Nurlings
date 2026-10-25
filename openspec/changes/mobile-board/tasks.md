# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal, the decisions in `design.md` (header entry, bottom
  pinned composers, no inline Approve, shared logic in `@rakazo/core`, the additive push
  `ticketId`) and the copy table. Verify: explicit approval in the session. No code before this.

## 2. Shared logic in `@rakazo/core`

- [ ] 2.1 Create `packages/core/src/tickets/` and move `columns`, `dates`, `quick-add`,
  `mentions` (pure parts) and `mergeActivity` from the web board with their tests, then export
  them from the package index. Verify: the moved tests pass unchanged in `@rakazo/core`.
- [ ] 2.2 Re-point the web board and modal imports to core and delete the moved web files. Verify:
  the existing web board, modal and narrow-sheet tests pass untouched; `pnpm --filter
  @rakazo/web check` passes.
- [ ] 2.3 Add `cardDates` and `ticketCard`, and use them from the web `BoardCard` and
  `CardDates`. Verify: new `card.test.ts` (working vs last comment, overdue only on open
  statuses, file count, `canApprove`); web `BoardView.test.tsx` passes unchanged.
- [ ] 2.4 Add `activityRows` and use it from the web `ActivityFeed`. Verify: new tests for the
  15-minute and day separator boundaries, a line for every event kind, hidden events, the
  resumed line with no actor; web `TicketModal.test.tsx` passes unchanged.
- [ ] 2.5 Add `mentionOptions` and `applyMention` and use them from the web
  `use-mention-input`. Verify: new tests for prefix-first order, the 8-option cap and caret
  placement; web mention tests pass unchanged.

## 3. Notifications carry the ticket (server)

- [ ] 3.1 Add optional `ticketId` to `NotificationMessage`, `expoPushData`, `notifyTicketUser`
  and its two callers (mention, overdue). Verify: unit test of `expoPushData` with and without
  it; extended `ticket-mentions` and `ticket-dates` postgres tests assert the id is in the push
  message; a chat push still has none.

## 4. Mobile foundations

- [ ] 4.1 `lib/board-enabled.ts`: flag cache, hook, and a cold-start fetch of `me`; add
  `ticketBoardEnabled` to `MobileMe`. Verify: unit tests for on, off, unknown-then-fetched.
- [ ] 4.2 Extract the SSE frame reader from `subscribeThread` into a shared helper and add
  `subscribeBoard`. Verify: the existing `subscribeThread` tests pass unchanged; a new test feeds
  frames, a heartbeat and an idle timeout to `subscribeBoard`.
- [ ] 4.3 Confirm `@expo/ui` 57 ships the date picker on iOS and Android and read how
  `MenuPickerMenu`, `NativeSegmentedControl` and `MenuView` are used. Verify: a short note in the
  PR; if a platform lacks a date picker, stop and ask the maintainer before adding anything.
- [ ] 4.4 `lib/board-live.ts` and `lib/ticket-activity.ts`: load, stream, refetch on event,
  4-second refetch while a run is active, foreground-only, reconnect with the shared retry
  helpers. Verify: hook tests with fake timers and a fake stream (event refetches, backgrounding
  stops it, working run polls, reconnect after a retryable error).
- [ ] 4.5 `lib/ticket-labels.ts` (status and priority labels). Verify: unit test covers every
  status and priority.
- [ ] 4.6 Extract the mention option list and icons from `thread-composer.tsx` into
  `components/mention-picker.tsx`. Verify: existing `thread-composer.test.tsx` and
  `thread-mention-catalog.test.tsx` pass unchanged.
- [ ] 4.7 `notification-open.ts`: `ticketId` routes to `/ticket` (ahead of the bot thread), keeps
  `spaceId`; `rakazo://ticket` links. Verify: unit tests for payload, prefixed keys, link, and
  that a chat payload still opens the thread.

## 5. Board screen

- [ ] 5.1 `app/board.tsx`, `board-pages`, `board-column`: paged columns, header with dot, name,
  count, Your turn, tint, Show N older, opens on the first column with cards. Verify: component
  tests for the columns from `boardColumns`, the counts, the older row and the initial page.
- [ ] 5.2 `board-card` with the long-press `MenuView`: fields from `ticketCard`, overdue colour,
  Move to / Approve / Open, optimistic move that reverts on error. Verify: component tests for
  the fields, Approve only In review, move success and refusal, tap opens.
- [ ] 5.3 `nurling-filter` and `quick-add` with the `@` picker, pinned above the keyboard.
  Verify: tests that the filter narrows and recounts, `@` lists and picks, send posts the
  `quickAddTicket` result, no `@` sends no owner, failure keeps the text.
- [ ] 5.4 Home entry: header item (iOS 26) and `HeaderButton` (Android, older iOS), only from
  `ticketBoardEnabled`; register both routes in `_layout.tsx`; pull to refresh. Verify: home
  tests for the entry present with the flag on and absent with it off; route test that a
  disabled flag replaces to home.

## 6. Ticket screen

- [ ] 6.1 `app/ticket.tsx` with the native segmented control, header ref, both segments kept
  mounted, space switch for a ticket in another space. Verify: tests that switching keeps a
  draft and that the space helper is used.
- [ ] 6.2 Ticket segment: title and description editing, clamp with Show more, chips with native
  menus and the date picker with Clear, latest-activity row, Approve pinned in review. Verify:
  tests for each chip's RPC payload (including the `YYYY-MM-DD[THH:mm]` form), a refused start
  after due, clamp only when overflowing, Approve only In review.
- [ ] 6.3 Files: image thumbnail grid into the existing `image` route, other files via
  `openMobileArtifact`, ticket owner as `botId`. Verify: tests that images and files split
  correctly and the route params are right.
- [ ] 6.4 Activity segment: `activity-feed` from `activityRows`, separators, working line,
  mention chips with `splitMentions` and `botHexColor`, markdown for plain comments, failed-run
  line. Verify: tests for separators, a coloured and a neutral chip, working line.
- [ ] 6.5 `reply-composer`: attach with the chat pickers and upload path, `@` picker, send with
  `mentions` and `artifactIds`, failure keeps the draft. Verify: tests for the payload, staged
  file limits and a failed send.

## 7. Copy

- [ ] 7.1 Add the proposal's copy to the five mobile locale maps (the same wording as the web
  catalogs where it exists). Verify: `apps/mobile/lib/i18n.test.ts` passes; no string outside
  the proposal table is added.

## 8. Checks and PR

- [ ] 8.1 Typecheck, Biome, unit tests for core, adapters, web and mobile. Verify: `pnpm
  --filter @rakazo/core test`, `@rakazo/web test`, `@rakazo/mobile test`, `@rakazo/mobile
  check`, and the repo lint all pass. The desktop Playwright suite is not run locally.
- [ ] 8.2 Open the PR on `feature/mobile-board` with Why / What / Testing, the quoted copy table
  and a plain statement that native mobile UI cannot be captured by CI (no screenshot link),
  plus what the maintainer should try on the preview APK. Verify: PR open.
- [ ] 8.3 Follow `.agents/skills/pr-watch/SKILL.md` with `pr-digest --watch` until CI is
  terminal; fix every actionable failure or comment. Verify: checks green on the head commit,
  nothing unresolved. Do not merge. No release tag; tell the maintainer when it is ready for a
  preview APK build.
- [ ] 8.4 After the maintainer merges, archive the change on its own `chore/archive-mobile-board`
  PR. Verify: `openspec validate --strict`.
