# Proposal

## Why

The ticket modal is two panes side by side. Below `md` it stacks them into one long scroll, so on
a phone or a portrait tablet:

- The activity and the reply box sit under the description and the files. To reply you scroll
  past the whole ticket, and the reply box scrolls away with the keyboard open.
- The properties are a four-column grid with labels, which wraps badly at 390px, and each control
  is 28px tall: too small to tap.
- A long description pushes everything else down.
- Image files show as name cards; you can't see them without downloading.
- The header carries Expand, which does nothing useful on a screen the modal already fills.
- Nothing says new activity came in while you were reading the ticket.

This change gives narrow screens a full-screen sheet with a Ticket tab and an Activity tab, laid
out for touch, and gives every width image thumbnails with a full-screen viewer.

## What Changes

Web and desktop only (Electron hosts the web UI). The mobile app has its own ticket screen and is
not touched. No server, contract or migration change.

### Breakpoint

The modal picks its layout from the window width (the dialog is portalled to the page, so its
width follows the window):

- **Wide** (1024px and up): today's two panes.
- **Narrow** (below 1024px, phones and portrait tablets): a full-screen sheet with two tabs. At
  768–1023px two panes would leave the ticket pane under 400px next to the activity, which is the
  cramped case.

### Narrow header

Back arrow (closes), then `Board / NUR-7` on the Ticket tab or the ticket title (one line,
truncated) on the Activity tab. No Expand, no close X (back closes), no more menu.

### Ticket tab

- Big title (same in-place editing).
- Properties as a wrapping row of chips: status pill with its dot, owner with `BotAvatar`, due,
  start, priority. Each opens the same picker as on desktop (`DropdownMenu`, `DatePicker`
  popover), sized for a phone. Chips are 44px tall.
- A latest-activity row: newest comment in one line, `Author: text`, its time and a chevron.
  Tapping it opens the Activity tab. Hidden when there is no comment.
- Description clamped to three lines with `Show more` when it overflows. Tapping the text edits it
  in place as today. An empty description shows the editor directly.
- Files: images as a 3-column grid of square thumbnails, tap opens a full-screen viewer; other
  files as full-width cards.
- In review: Approve pinned at the bottom, full width, above the safe area.

### Activity tab

- The feed fills from the bottom like chat (short feeds sit at the bottom, opening the tab scrolls
  to the newest), with the existing time separators and the working line.
- The reply box (attach + send) is pinned at the bottom and stays above the on-screen keyboard. Its
  text is 16px so iOS doesn't zoom on focus. Attach and Send are 44px.
- The reply box stays mounted while you switch tabs, so a draft and staged files survive.

### Switching tabs

Tap the tab, or swipe left/right on the content. A swipe that starts in a text field doesn't
switch.

### New-activity count

The Activity tab shows a small count of feed items that arrived since you last viewed the
activity, not counting your own. It clears when the Activity tab opens (narrow) or whenever the
modal is open (wide, where the activity is always on screen). Last-viewed is remembered per
browser; with storage blocked it lasts until the modal closes. A ticket you've never opened starts
at zero. Shown as `9+` above nine.

### Desktop

- Files get the same image thumbnail grid (auto-fill, about 7rem squares) and full-screen viewer;
  other files keep their cards.
- Spacing polish to match the mockup: ticket pane `px-10 py-8`, activity pane 26rem wide. Nothing
  else moves.

### Touch and safe area

Every control on the narrow sheet is at least 44px. The sheet pads its bottom with
`env(safe-area-inset-bottom)` and its top with `env(safe-area-inset-top)`.

### Proposed copy

| Copy | Where | Why it is needed |
|---|---|---|
| `Ticket` | first tab | Names the tab that holds the ticket; two unlabeled tabs can't be told apart. |
| `Activity` | second tab | Names the feed tab; same reason. |
| `Show more` | under a clamped description, only when it overflows | The only way to see the rest without entering edit mode. Gone once expanded. |
| `Close image` | viewer close button, accessible name only | The viewer is icon-only. |

Reused unchanged: `Back`, `Board`, status, priority and date labels, `Approve`, `Reply`, `Attach
file`, `Send`, `{name} is working…`. The count badge is a number. Removed on narrow: Expand/Collapse
and the close X.

### No more menu

The mockup puts `···` in the header, but the modal has no actions that aren't already a chip or a
button (there is no delete, no deep link to copy). It is left out until a real action exists.

### Upstream merge safety

New code lives in `apps/web/src/components/board/TicketModal/`. Edits to existing files there
(all from this fork, none upstream-owned) are listed in `design.md`. No file outside that folder
changes except the e2e spec and the locale catalogs.

## Impact

- Capability: extends `board-tickets` (modifies "The ticket modal can fill the window"; adds the
  narrow layout, image thumbnails and the new-activity count).
- Web only. No API, contract, schema or migration change.
- One `localStorage` key for last-viewed activity, pruned to the 200 most recent tickets.
- Contacts no Rakazo-owned infrastructure.
