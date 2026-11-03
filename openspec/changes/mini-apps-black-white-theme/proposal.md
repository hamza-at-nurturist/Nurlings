# Proposal

## Why

Mini apps are dashboards, and they look best as a clean sheet. They drew on the app's softer greys:
a dark grey page with lighter grey cards, and light grey cards on white. Pure black and pure white
with a hairline border between things read as sharper and match shadcn's own neutral look.

## What Changes

A mini app draws on pure black in the dark theme and pure white in the light theme, following the
theme switch, with shadcn's neutral palette (foreground, muted, accent, border) for its components.
Cards sit on the same surface and are set apart by a border instead of a grey fill.

The colors are set on the mini app's own container, so nothing outside it changes: the rest of the
screen, the chat, the sidebar and every other page keep the app's current theme.

Not in this change: the app's own theme tokens, mobile, and desktop chrome.

## Impact

- Capability: `mini-apps`.
- One new stylesheet next to the mini app code, one class on the container. No dependency,
  migration, API change or visible copy.
