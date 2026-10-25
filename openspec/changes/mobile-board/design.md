# Design

## Where the code goes

### Shared: `packages/core/src/tickets/` (exported from `@rakazo/core`)

`@rakazo/core` is already what web and mobile share for chat logic (`time-separators`,
`composer-mentions`, `botHexColor`), has no DOM or React Native dependency, and already depends on
`@rakazo/contracts`. A new package would only add a workspace entry for the same audience.

| Module | Holds | Today |
|---|---|---|
| `columns.ts` | `boardColumns` (six columns, owner filter, 7-day Done rule) | `web/.../BoardView/columns.ts` |
| `dates.ts` | `localDate`, `localTime`, `quickPickDates`, `formatTicketDate`, `isTicketOverdue`, and `cardDates(ticket, now, tz, labels, locale)` returning `{ start, due, overdue }` | `web/.../TicketModal/dates.ts` |
| `card.ts` | `ticketCard(ticket, { bots, now, tz, labels, locale })`: ref, needsUser, title, working owner or worker, last comment, owner, dates, file count, `finished`, `canApprove` | fields read inline in `BoardCard.tsx` |
| `quick-add.ts` | `quickAddTicket(text, picked)` | `web/.../BoardView/quick-add.ts` |
| `mentions.ts` | `hasMentionToken`, `splitMentions`, `resolveMentionTargets`, `activeMentionToken`, `mentionColor`, plus the two pure halves of the web `useMentionInput`: `mentionOptions(bots, query)` (filter, prefix first, max 8) and `applyMention(text, token, caret, bot)` (new text and caret) | `web/.../TicketModal/mentions.ts`, `use-mention-input.ts` |
| `activity.ts` | `mergeActivity`, and `activityRows(items, viewer)`: drops events with no line, marks each row `separated` with `needsTimeSeparator`, and returns each line as data (`{ kind: "moved", actor, status }`) | `mergeActivity` in `web/.../activity.ts`; the loop and `eventLine` in `ActivityFeed.tsx` |
| `types.ts` | `Viewer`, `ActorRef`, `RelativeDayLabels`, `ActivityLine` | `Viewer` in `ActivityFeed.tsx` |

What stays per platform, on purpose:

- **Copy.** Web uses Lingui, mobile uses `t()` and typed locale maps. The shared code returns
  *which* sentence (`{ kind: "moved", actor, status }`), each platform turns it into text. The
  strings match word for word.
- **React state and DOM.** `useMentionInput` (textarea, refs, `useLayoutEffect`) keeps its web
  shell around the shared pure halves; mobile has its own `TextInput` shell.
- **Storage.** The web new-activity count (`activity-seen.ts`) stays web-only.
- **Avatars and colours.** Web `BotAvatar` and mobile `components/bot-avatar.tsx` already share
  `@rakazo/core` avatar logic.

Moving code means moving its tests: `columns.test.ts`, `quick-add.test.ts`, `activity.test.ts`,
`dates.test.ts` and `mentions.test.ts` go to `packages/core/src/tickets/`, assertions unchanged.
The web components keep their own render tests and are the proof that behaviour did not move.

### Mobile

```
apps/mobile/
  app/board.tsx                    Board screen (stack route)
  app/ticket.tsx                   Ticket screen (stack route, ?ticketId=&spaceId=)
  components/board/
    board-pages.tsx                horizontal pager of columns
    board-column.tsx               header + vertical list
    board-card.tsx                 card + long-press menu
    nurling-filter.tsx             All + avatars
    quick-add.tsx                  pinned input + @ picker
    ticket-properties.tsx          chips + native menus and date picker
    ticket-files.tsx               image grid + file cards
    activity-feed.tsx              rows, separators, working line, mention text
    reply-composer.tsx             pinned input, attach, @ picker
  components/mention-picker.tsx    option list + icons, extracted from thread-composer.tsx
  lib/board-live.ts                tickets + bots + timezone, stream, refetch
  lib/ticket-activity.ts           comments, events, files, runs for one ticket
  lib/ticket-labels.ts             status and priority labels via t()
  lib/board-enabled.ts             flag cache + hook
```

Existing files touched (small):

| File | Change |
|---|---|
| `app/index.tsx` | Board header item and `HeaderButton`, shown from `me.ticketBoardEnabled` |
| `app/_layout.tsx` | Two `Stack.Screen` entries |
| `lib/api.ts` | `MobileMe` also picks `ticketBoardEnabled`; `subscribeBoard`, built on a shared SSE reader pulled out of `subscribeThread` |
| `lib/notification-open.ts` | `ticketId` routes to `/ticket`; `rakazo://ticket` links |
| `components/thread-composer.tsx` | Mention list and icons move to `components/mention-picker.tsx`; no behaviour change |
| `lib/locales/*.ts` | New copy from the proposal |
| `packages/adapter-kit/src/types.ts`, `packages/adapters/src/expo-push.ts`, `ticket-changes.ts`, `ticket-dates.ts` | Optional `ticketId` on the notification |

## Decisions

### 1. Entry: a header item, not a list row

Home already has Account on the left and Activity, Search, Create on the right. A fourth right
item keeps the board one tap away from anywhere on home without taking a row from the inbox or
adding words. The iOS 26 header groups items, so four 44pt controls fit a 390pt phone. The
alternative, a pinned "Board" row with a count of tickets that need you, is more discoverable and
can carry a number, but it adds persistent chrome and a word to every home screen for users who
never use the board. Recommended: header item. The maintainer can flip this before approval.

### 2. Flag handling

`me` already returns `ticketBoardEnabled`; home loads `me` on every focus, so the entry follows
it. `lib/board-enabled.ts` keeps the last value in memory for the routes. A route reached cold
(a notification tap, a link) fetches `me` first, and if the flag is off `router.replace("/")`
without showing a board. The server enforces the flag independently, so a stale client gets an
error, never data.

### 3. Paging

An outer horizontal `FlatList` of six pages, `snapToInterval = pageWidth + gap`,
`decelerationRate="fast"`, `disableIntervalMomentum`. Page width is
`min(84% of the window, 380pt)`: on a phone the next column peeks, on a tablet several show. Each
page is a vertical `FlatList` (virtualised) under a fixed column header. Orientations differ, so
the nested scroll views do not fight; Android gets `nestedScrollEnabled`. The board opens on the
first column that has cards.

### 4. Live updates

Same sources as web, in the same order:

1. `tickets.list` for the board, `bots.list` for avatars, `me` for the timezone.
2. `boards.subscribe` for events. Mobile has no oRPC event-iterator client, but
   `subscribeThread` already reads Server-Sent Events from `/rpc/threads/subscribe` with
   idle-timeout and reconnect. The frame reader is extracted into one helper that
   `subscribeThread` and the new `subscribeBoard` share, so there is one SSE parser, not two.
3. Each event refetches the list, and bumps a revision that makes the open ticket refetch its
   comments, events, files and runs. Reconnect uses the shared `isRetryableError` and
   `retryDelayMs` web uses.
4. While a Nurling has an active run for the open ticket, activity also refetches every 4s (web's
   `POLL_MS`), with `useForegroundPoll` so nothing runs in the background.

The stream is closed when the app leaves the foreground and reopened with a full refetch on
return. The board and ticket screens share one subscription through `lib/board-live.ts`.

### 5. Long-press menu

The pattern is `message-context-menu.tsx`: `MenuView` from `@expo/ui/community/menu` with
`shouldOpenOnLongPress`, so iOS gets the system context menu with the card previewed and Android
gets its native menu. Actions: `Move to` as a submenu of six statuses with the current one
checked, `Approve` while In review, `Open`. A plain tap opens the ticket. A move updates the
list immediately and the refetch afterwards restores the card if the server refused, as on web.
Approve calls `tickets.approve` straight away; the menu choice is the deliberate step, as the web
button is.

### 6. Quick-add and reply composers

Both are pinned to the bottom with the thread screen's keyboard handling
(`react-native-keyboard-controller`, `lib/keyboard-layout.ts`), not a modal. Typing `@` filters
`mentionOptions` from core and shows the same option list the chat composer shows, extracted
into `components/mention-picker.tsx`. Picking inserts `@Name` with `applyMention` and records the
Nurling in the same way as web (`mentioned()` drops a Nurling whose `@Name` was deleted).
`quickAddTicket` decides title, description and owner; no `@` leaves the owner out so Chief
triages. The reply composer sends `tickets.comment` with `mentions` and `artifactIds`.

Attachments reuse the chat composer's pickers (`pickFromLibrary`, `takePhoto`, `pickDocuments`
in `lib/pick-attachments.ts`, the same size and type limits) and the same upload path
(`artifacts.create` for the ticket owner, as web does). The chat composer itself is not reused:
it carries slash actions, voice and reply quoting that tickets do not have.

### 7. Ticket screen

The segmented control is the existing `NativeSegmentedControl` (SwiftUI segmented picker on iOS,
Compose on Android, pills as the fallback). It sits under the native header. Both segments stay
mounted so a draft, staged files and scroll position survive switching.

Property chips are plain `Pressable` pills (custom surface, `StyleSheet` + tokens) that open
native controls: status, owner and priority with `MenuPickerMenu` (the native menu already used
by settings rows); start and due with the platform date picker from `@expo/ui` (SwiftUI
`DatePicker` in a sheet on iOS, Material date and time dialogs on Android), with a Clear action.
Dates are picked and shown in the user's saved timezone, sent as the same
`YYYY-MM-DD[THH:mm]` strings web sends.

The title is edited by tapping it (a `TextInput` that saves on blur); the description the same,
clamped to three lines with Show more. Images use `components/image-artifact-viewer.tsx` through
the existing `image` route, with the ticket owner as the artifact's `botId`. Other files open
through `openMobileArtifact`. Approve is pinned above the bottom inset while In review.

### 8. Activity feed

`activityRows` supplies the rows; mobile renders them. Comments are cards using the
`StyleSheet` tokens; event lines are small muted text; separators reuse
`components/time-separator.tsx` and core's `needsTimeSeparator`, the rule chat uses. Mention
text is `splitMentions` rendered as nested `Text`: a chip is a tinted rounded `Text` with the
Nurling's `botHexColor` (neutral for users and non-hex colours). Comments without mentions render
through the existing chat markdown. The feed is an inverted-style list so short feeds sit at the
bottom and new items land above the composer.

### 9. Notifications open the ticket

`NotificationMessage` gains optional `ticketId`. `expoPushData` includes it when present.
`notifyTicketUser` (used for "{Nurling} mentioned you on NUR-7" and "NUR-7 is overdue") passes
the ticket id; its other fields are unchanged, so the push still honours the Nurling's
notify-on-finish setting and still carries `botId` and `threadId`. `notificationOpenTarget`
returns `/ticket` with `ticketId` (and `spaceId`) when the payload has one, ahead of the bot
thread; `rakazo://ticket?ticketId=` links do the same. An older app ignores `ticketId` and opens
the Nurling's chat, an older API never sends it: both directions work during a rollout.
Opening a ticket from another space switches space first, with the same `threadSpaceRequest`
helpers the thread screen uses.

### 10. What is deliberately not here

No drag and drop, no create dialog beyond quick-add, no board rename, no search within the board,
no new-activity count, no delete. No offline queue: like the web board, a failed write shows an
error and keeps what the user typed.

## Risks

- **Header crowding on small phones / large Dynamic Type.** The header items are system
  controls; if four is too many on a small device the fallback is the pinned row from
  decision 1. Covered by the maintainer's preview-APK test.
- **Nested horizontal and vertical lists on Android.** Known to work with `nestedScrollEnabled`;
  verify swipe feel on a device.
- **Native date picker availability.** The plan assumes `@expo/ui` 57 ships a date picker on both
  platforms (SwiftUI `DatePicker`, Compose date and time dialogs) and the repo's
  `compose-available` check guards the Android views. Dependencies are not installed in this
  session, so task 4.3 confirms this first. If a platform lacks it, the fix is to ask the
  maintainer before adding any dependency; nothing is added silently.
- **Moving code out of web.** Pure refactor under existing tests; reviewers should see only
  import changes in web components.

## Tests

- **Core** (Vitest): the moved suites, plus new `card.test.ts` (working vs last comment, overdue
  only for open statuses, file count, `canApprove`), `activityRows` (separator at the 15-minute
  and day boundaries, lines for every event kind, hidden events), `mentionOptions` and
  `applyMention` (prefix order, max 8, caret).
- **Adapters / API**: `expoPushData` with and without `ticketId`; `notifyTicketUser` passes the
  ticket id for the mention and the overdue push (existing postgres tests extended).
- **Mobile lib** (Vitest, existing React Native test setup under `apps/mobile/lib`):
  `notification-open` for `ticketId` and `rakazo://ticket`; `board-enabled`; board components
  render fields and the long-press action list per status (Approve only In review); the entry is
  absent when the flag is off; quick-add posts the parsed ticket; reply posts mentions and
  artifact ids.
- **Not in CI**: see the proposal table. The maintainer tests the native menus, picker, paging and
  push on a preview APK; the manual Android screenshots workflow can add board and ticket shots.
