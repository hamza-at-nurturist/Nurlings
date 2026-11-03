# Proposal

## Why

Mini apps so far are single dashboards: tiles, a table, a chart. A real operations product is more:
a sidebar with several screens, a leads table with tabs, filters and rich cells, a conversation view
with decision cards, and a review screen with a rating panel. As a test of how far the format can
go, an existing operations dashboard design was rebuilt as one mini app, with made-up data. It could
not be drawn with the catalog, which is what this change fixes.

## What Changes

The mini app catalog grows to the vocabulary of the shadcn components (25 components in total, up
from 13), drawn with the app's own Base UI shadcn components:

- **Structure.** Grid (with a sidebar layout), Separator, Stack alignment, borders and fixed widths,
  Avatar, Icon (from a fixed list of names), and an edge-to-edge layout for apps with their own
  sidebar and header.
- **Navigation and state.** A button can set a value under `/ui` in the app's own state
  (`setState`), so one file can hold several screens shown by a visible condition, with an active
  navigation item. Tabs can show counts.
- **Data.** Stat tiles with a trend line and a change chip, a segmented Meter, a Breakdown bar with a
  legend, and Tables whose columns can be stacked, tag, meter, rating or menu cells, whose tones come
  from the row's own data, and which can be filtered by a bucket tab (`where`) and by typed text
  (`search`).
- **Conversation and change.** A Message component for chat bubbles with decision cards, and a Diff
  component for a before and after text.
- **Controls.** Input, Textarea, Select and ToggleGroup, bound to the app's state, which a Table can
  follow.
- **Bot guidance.** The Apps skill lists the new vocabulary and how to build a multi-screen app.

Everything is still checked against the catalog; a file that uses anything outside it is refused
whole. The validator now says which element failed, in the console, to help whoever writes the file.

Not in this change: server-run queries and writes, saving what a person types, mobile and desktop
renderers, the dialogs and menus of shadcn (they draw outside the mini app's container).

## Impact

- Capability: `mini-apps`.
- No new dependency beyond the shadcn components already added for the gallery preview (accordion,
  avatar, carousel, slider, pagination). Web only.
