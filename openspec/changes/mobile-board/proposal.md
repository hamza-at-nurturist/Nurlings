# Proposal

## Why

The Board exists on web and desktop only. On a phone the people who most need it, the ones
getting "Report attached, ready for you" or a blocking question from a Nurling, have no way to
see what is waiting, approve a ticket, answer a Nurling or tell one what to do without opening
the web app in a browser. The web modal already has a phone layout, but a browser tab is not the
app: no push-to-ticket, no native pickers, no camera or photo library.

This change brings the Board to the Expo app as native screens: a paged board, a ticket screen
with Ticket and Activity, and push notifications that open the ticket.

## What Changes

### Entry

A Board button in the home screen's header, next to Activity and Search, shown only when
`me.ticketBoardEnabled` is true (`TICKET_BOARD_ENABLED` on the server). Native header item on
iOS 26 (SF Symbol, no extra text), the existing `HeaderButton` on Android and older iOS. With the
flag off there is no entry and the routes close themselves if reached by a link or a notification.

### Board screen

- Six columns (To do, In progress, In review, Blocked, Done, Won't do) as horizontally paged
  lists: one column per page at about 84% of the width so the next one peeks in, snapping page
  to page. Each page starts with a header of status dot, name and count, plus the "Your turn"
  pill and tint while In review has cards. Opens on the first column that has cards.
- A Nurling filter row under the header: All plus one avatar per Nurling, scrolling sideways.
- Quick-add pinned above the keyboard at the bottom: "Tell a Nurling what to do…". Typing `@`
  lists the Nurlings; picking one owns the ticket. With no `@`, Chief triages, as on web.
- Cards show what the web card shows: ref, Needs you badge, title, "{name} is working…" or the
  latest comment (two lines), owner avatar and name, dates (due in red when overdue), file count.
  Done shows the last 7 days and "Show N older".
- No drag. Tapping a card opens the ticket. Long-pressing a card opens the native context menu:
  Move to (the six statuses, current one checked), Approve (In review only), Open. A move shows
  at once and reverts with an error if the server refuses it, as on web.
- Pull to refresh; live updates through the same `boards.subscribe` stream the web board uses,
  plus the same few-seconds refetch while a Nurling is working.

### Ticket screen

A stack screen, `ticket`, with a native segmented control: Ticket | Activity.

- **Ticket**: title (tap to edit), property chips (status, owner, priority, start, due) that open
  native menus and date pickers, the latest-activity row (opens the Activity segment), the
  description clamped to three lines with Show more, image files as a thumbnail grid that opens
  the app's existing image viewer, other files as cards that open like chat files, and Approve
  pinned at the bottom while the ticket is In review.
- **Activity**: a chat-like feed with the same merged events, comments, files, failed-run lines,
  time separators and "{name} is working…" line as web; a reply composer pinned above the
  keyboard with attach (photo library, camera, file; the chat composer's pickers) and `@`
  mentions. Mentions render as coloured chips in the feed, using the Nurling's own colour.

### Push notifications open the ticket

The two ticket notifications the server already sends (a Nurling mentioned you; a ticket is
overdue) carry the ticket id. Tapping one opens the ticket screen in the right space. Builds
that predate this change ignore the extra field and still open the Nurling's chat. This is an
additive server change: `NotificationMessage` gains an optional `ticketId`, and the Expo push
data carries it.

### Shared logic

Everything that is not rendering moves into `@rakazo/core` (`packages/core/src/nurlings-board/`) and
both clients import it: board columns and the 7-day Done rule, card fields and date labels
(including overdue), quick-add parsing, mention parsing and picker options, and activity
merging with its time-separator rows. The web files that hold those today become imports of the
shared module and their tests move with the code. Platform code keeps only components, copy
(Lingui on web, `t()` on mobile) and storage. See `design.md`.

### Proposed copy

Every visible word, with why it is needed. "Reused" means the string already exists in the
mobile catalog (or is the same word as on web).

| Copy | Where | Why it is needed / why not removable |
|---|---|---|
| `Board` | Entry accessibility label, screen title | Names the place; the entry is icon-only so there is no visible word on home. Title is a nav title. |
| `All` | Filter row, first item | Only way back from a Nurling filter. |
| `Tell a Nurling what to do…` | Quick-add placeholder | The input's only label; the noun comes from the brand config. Same as web. |
| `To do`, `In progress`, `In review`, `Blocked`, `Done`, `Won't do` | Column headers, Move to, status chip | The columns' names; same as web. |
| `Your turn` | In review header, only while it has cards | Explains why the column is tinted. First thing to cut if the maintainer wants less chrome. |
| `Needs you` | Card badge, only when it applies | Why a ticket is asking for attention. Same as web. |
| `{name} is working…` | Card and feed, only while a run is active | Live state. Same as web. |
| `Show {count} older` | End of Done, only when older tickets exist | Only way to reach them. Same as web. |
| `Move to`, `Approve`, `Open` | Long-press menu | The three actions. `Approve` only In review. |
| `Ticket` | Segment | Names the segment; `Activity` is reused. |
| `Description`, `Files` | Section labels | Two sections of different kinds; `Files` only when there are files. |
| `Show more` | Under a clamped description, only when it overflows | Only way to read the rest without editing. |
| `Status`, `Owner`, `Priority`, `Start`, `Due` | Picker titles; empty date chips | An empty chip must say which date it is; the others title the native picker. |
| `Low`, `Normal`, `High`, `Urgent`, `Clear` | Priority and date pickers | The choices. |
| `Reply` | Composer placeholder | The input's only label. Same as web. |
| `You`, `Someone` | Feed author and actor names | Who did it. |
| Feed lines (`{actor} moved it to {status}`, `{actor} created this and assigned it to {owner}`, `{actor} created this`, `{actor} assigned it to {owner}`, `{actor} approved it`, `Moved back to {status}`, `{actor} attached {name}`, `You attached {name}`, `{name} couldn't finish, reply to retry`) | Activity | The history itself; same wording as web so a ticket reads the same in both. |

Reused unchanged: `Activity`, `Photo library`, `Camera`, `File`, `Today`, `Yesterday`, the
generic error strings. No explainer text, no empty-state prose: an empty column is just its
header and a zero.

Removed on purpose: the web card's inline Approve button (long-press menu and the ticket screen
carry it; an inline button in a scrolling list is an easy mis-tap), the web "more" menu, the
web new-activity count on the Activity tab (a native segmented control cannot hold a badge, and
mobile has no per-device read state yet).

### Mobile flows CI can and cannot cover

| Flow | Covered by |
|---|---|
| Columns, 7-day Done rule, card fields, overdue, quick-add parsing, mention parsing and options, activity merge and separator rows | Unit tests in `@rakazo/core` (CI) |
| Push payload carries `ticketId`; mobile routes a ticket notification and a `rakazo://ticket` link | Unit tests in adapters and `apps/mobile/lib` (CI) |
| Board and ticket components render the right fields, hide the entry when the flag is off, call the right RPCs (move, approve, comment, update, create) | Mobile component tests with the existing React Native test setup (CI) |
| Type correctness of both new routes | `pnpm --filter @rakazo/mobile check` (CI) |
| Native header item, long-press context menu, native segmented control, native date picker, paging feel, keyboard behaviour, camera and photo picker, tapping a real push | Not covered: needs a device or emulator with a seeded board. Tested by the maintainer on a preview APK. |
| Board and ticket screenshots | Optional: the manual "mobile Android screenshots" workflow can capture them once the seed includes tickets; not part of required checks. |

### Upstream merge safety

All new code lives in fork-owned folders, named so upstream is unlikely to create them:
`apps/mobile/app/(nurlings)/` (routes), `apps/mobile/components/nurlings-board/`,
`apps/mobile/lib/nurlings-board/` and `packages/core/src/nurlings-board/`. Upstream mobile files
are not refactored. The only upstream-owned files touched are the home header button
(`app/index.tsx`) and the push `ticketId` path (`NotificationMessage`, `expo-push.ts`,
`ticket-changes.ts`, `ticket-dates.ts`, and a few lines in `notification-open.ts`), plus the
one-word `export` on two private helpers in `thread-composer.tsx`. `design.md` lists each edit and
has an "Upstream overlap" section for what to do if upstream ships its own mobile board. Web
board files are fork-owned already; their pure logic moves to core.

## Impact

- New capability `mobile-board`; `board-tickets` gains "Ticket notifications carry the ticket".
- Mobile app: two routes, ~12 components. Copy is added in English only: `t()` falls back to the
  source string for locales without it, and the typed locale maps are upstream files left alone.
- `@rakazo/core`: new `nurlings-board/` module, exported from the package index.
- Web: imports re-pointed to core; no behaviour change (the existing web tests keep passing).
- API and adapters: additive optional `ticketId` on the notification message and Expo data. No
  schema, migration or contract change. Old and new API/clients interoperate in both directions.
- Contacts no Rakazo-owned infrastructure. Expo push already goes through the existing provider.
