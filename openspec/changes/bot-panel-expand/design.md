# Design

## Where the panel sits

`Shell.tsx` renders `BotsSidebarLayout`, a `relative flex` root holding the sidebar, `<main>` (the
chat) and `ShellSidePanel`. The panel is an `<aside data-testid="side-panel">` from
`ResizableSidePanel`: `absolute inset-y-0 end-0 z-20`, and `md:relative` (a flex sibling of
`<main>`) when there is room, otherwise it stays absolute over the chat. Its width comes from
`--panel-width`. The close button lives in `side-panel.tsx`'s header, shared by all bot tabs and
the group panel; the bot tabs are `BotSettings` in `bot-panel.tsx`, which has no header of its own.
The root also carries `--sidebar-width`, set to the sidebar's current width (mini width when
collapsed).

## Decision: how the aside learns it is expanded

The width and position are decided in `ResizableSidePanel`, but the header is in `side-panel.tsx`.

- **Chosen: a fork-owned component renders the button and, while expanded, a hidden marker
  (`data-bot-panel-expanded`). A fork-owned stylesheet imported by that component styles
  `aside:has(> … [data-bot-panel-expanded])` to `position: absolute`, start offset
  `var(--sidebar-width)` from `md` up, `inset-inline-end: 0`, `width: auto`, `max-width: none`.**
  Unlayered CSS beats Tailwind's layered utilities, so no `!important`. State and the Escape
  listener live in the same component, which unmounts with the header, so closing resets it.
  Upstream edit: one import and one JSX line in `side-panel.tsx`.
- Alternative: add an `expanded` prop to `ResizableSidePanel` and thread it from `Shell.tsx`
  through `ShellSidePanel`. Plain React, no `:has()`, but it edits three upstream files, one of
  them a long single-line `className` that upstream changes often.
- Alternative: add a single `data-expanded` attribute line to `ResizableSidePanel` for the CSS to
  key on. Smaller than the prop, but still a second upstream file; fall back to this if the
  `:has()` coupling to `data-testid="side-panel"` proves fragile.

## Escape

A `keydown` listener on `window`, active only while expanded, collapses on Escape unless the event
is already `defaultPrevented`, is an IME composition, or came from inside an open dialog, menu or
popover (they close themselves first). The inline name editor already handles its own Escape; the
listener ignores events from text fields so one press cancels the edit and a second collapses.
The full-screen computer is `fixed z-30`, above the expanded panel, and keeps its own Escape.
