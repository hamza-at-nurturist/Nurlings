# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal, the decisions in `design.md` (header entry, bottom
  pinned composers, no inline Approve, shared logic in `@rakazo/core`, the additive push
  `ticketId`) and the copy table. Verify: explicit approval in the session. No code before this.

## 2. Shared logic in `@rakazo/core`

- [x] 2.1 Create `packages/core/src/nurlings-board/` and move `columns`, `dates`, `quick-add`,
  `mentions` (pure parts) and `mergeActivity` from the web board with their tests, then export
  them from the package index. Verify: the moved tests pass unchanged in `@rakazo/core`.
- [x] 2.2 Re-point the web board and modal imports to core and delete the moved web files. Verify:
  the existing web board, modal and narrow-sheet tests pass untouched; `pnpm --filter
  @rakazo/web check` passes.
- [x] 2.3 Add `cardDates` and `ticketCard`, and use them from the web `BoardCard` and
  `CardDates`. Verify: new `card.test.ts` (working vs last comment, overdue only on open
  statuses, file count, `canApprove`); web `BoardView.test.tsx` passes unchanged.
- [x] 2.4 Add `activityRows` and use it from the web `ActivityFeed`. Verify: new tests for the
  15-minute and day separator boundaries, a line for every event kind, hidden events, the
  resumed line with no actor; web `TicketModal.test.tsx` passes unchanged.
- [x] 2.5 Add `mentionOptions` and `applyMention` and use them from the web
  `use-mention-input`. Verify: new tests for prefix-first order, the 8-option cap and caret
  placement; web mention tests pass unchanged.

## 3. Notifications carry the ticket (server)

- [x] 3.1 Add optional `ticketId` to `NotificationMessage`, `expoPushData`, `notifyTicketUser`
  and its two callers (mention, overdue). Verify: unit test of `expoPushData` with and without
  it; extended `ticket-mentions` and `ticket-dates` postgres tests assert the id is in the push
  message; a chat push still has none.

## 4. Mobile foundations

- [x] 4.1 `lib/nurlings-board/enabled.ts`: flag cache and hook that fetch `me` themselves. Verify:
  unit tests for on, off, unknown-then-fetched.
- [x] 4.2 `lib/nurlings-board/event-stream.ts`: a small SSE reader and `subscribeBoard`, leaving
  `subscribeThread` untouched. Verify: a test feeds frames, a heartbeat and an idle timeout.
- [x] 4.3 Confirm `@expo/ui` 57 ships the date picker on iOS and Android. Verify: it does
  (`@expo/ui/community/datetime-picker`, `presentation` for the Android dialog); no dependency added.
- [x] 4.4 `lib/nurlings-board/live.ts` and `ticket-activity.ts`: load, stream, refetch on event,
  4-second refetch while a run is active, foreground-only, reconnect with the shared retry
  helpers. Verify: hook tests with fake timers and a fake stream (event refetches, backgrounding
  stops it, working run polls, reconnect after a retryable error).
- [x] 4.5 `lib/nurlings-board/labels.ts` (status and priority labels). Verify: typecheck; the
  labels are exercised through the column render test.
- [x] 4.6 Add `export` to `MentionOptionIcon` and `MentionChipIcon` in `thread-composer.tsx`
  and nothing else. Verify: `git diff` of that file is two words; existing
  `thread-composer.test.tsx` passes unchanged.
- [x] 4.7 `lib/nurlings-board/notification.ts` builds the `/ticket` route (keeps `spaceId`);
  `notification-open.ts` gets one early branch for a payload or `rakazo://ticket` link with a
  `ticketId`. Verify: unit tests for payload, prefixed keys, link, and
  that a chat payload still opens the thread.

## 5. Board screen

- [x] 5.1 `app/(nurlings)/board.tsx`, `board-pages`, `board-column`: paged columns, header with dot,
  name, count, Your turn, tint, Show N older, opens on the first column with cards. Verify: render
  test of a column (name, count, Your turn only with cards, Show N older); typecheck; paging and
  initial page on the preview APK.
- [x] 5.2 `board-card` with the long-press `MenuView`: fields from `ticketCard`, overdue colour,
  Move to / Approve / Open, optimistic move that reverts on error. Verify: render tests for the
  fields, overdue colour, working line, the menu per status, and move / approve / open reported;
  the revert is the board's reload after the call (preview APK).
- [x] 5.3 `nurling-filter` and `quick-add` with the `@` picker, pinned above the keyboard.
  Verify: the logic is the shared tested code (`quickAddTicket`, `mentionOptions`, `applyMention`,
  mention input state); the components are typechecked and tried on the preview APK.
- [x] 5.4 Home entry: header item (iOS 26) and `HeaderButton` (Android, older iOS), only from
  `useNurlingsBoardEnabled()`; `_layout.tsx` is not edited; pull to refresh. Verify: tests that
  both headers show Board with the flag on and not with it off, and that Board pushes `/board`;
  the existing home tests pass with `boardEnabled: false` in their scope.

## 6. Ticket screen

- [x] 6.1 `app/(nurlings)/ticket.tsx` with the native segmented control, header ref, both segments
  kept mounted, space switch for a ticket in another space. Verify: typecheck; the space helper
  reuses `threadSpaceRequest` / `threadSpaceSwitchResult` (tested upstream); draft survival on the
  preview APK.
- [x] 6.2 Ticket segment: title and description editing, clamp with Show more, chips with native
  menus and the date picker with Clear, latest-activity row, Approve pinned in review. Verify:
  typecheck; date strings tested (`date-input.test.ts`); menus, picker and clamp on the preview APK.
- [x] 6.3 Files: image thumbnail grid into the existing `image` route, other files via
  `openMobileArtifact`, ticket owner as `botId`. Verify: `isTicketImage` / `shortFileType` tests;
  viewer and file opening on the preview APK.
- [x] 6.4 Activity segment: `ActivityFeed` from `activityRows`, separators, working line,
  mention chips with `splitMentions` and `botHexColor`, markdown for plain comments, failed-run
  line. Verify: `activityRows` and mention tests in core; rendering on the preview APK.
- [x] 6.5 `reply-composer`: attach with the chat pickers, `@` picker, send with `mentions` and
  `artifactIds`, failure keeps the draft. Verify: typecheck; attach, upload and send on the
  preview APK.

## 7. Copy

- [x] 7.1 Copy is `t()` source strings with the web catalogs' wording, translated in
  `lib/locales/nurlings-board/` and spread into each locale map. Verify: `apps/mobile/lib/i18n.test.ts`
  passes; no string outside the proposal table is added.

## 8. Checks and PR

- [ ] 8.0 Check the diff against `design.md` "Existing upstream files touched". Verify: `git diff --stat origin/main` lists no upstream file outside that table.
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
