# Proposal

## Why

Bots already build dashboards as HTML artifacts, but they come out inconsistent (each bot invents its
own look), static (the numbers are baked in, so every refresh is a new version), and the Artifacts
screen mixes files people uploaded in with what bots made, so the per-bot filter shows documents
that are not bot output.

## What Changes

1. **Dashboard guidance.** A built-in "Dashboards" skill gives bots one monochrome look (ink, muted
   greys, light and dark) and a few copy-ready chart and tile snippets, so dashboards read as one
   system. Text only.
2. **Live numbers.** A dashboard can read a JSON artifact its bot made, by name, and the bot
   refreshes the numbers by attaching that JSON again. The page never gets credentials or network
   access; the app reads the artifact with the user's own session.
3. **Few shared-file edits.** Built from new files plus one-line hooks, so upstream syncs stay easy.
4. **Uploads hidden by default.** The Artifacts screen gets an "Uploads" toggle, off by default,
   that hides files people uploaded (items with no run) so the list shows what bots made.

Sharing and comments are out of scope.

## Delivery

All of it ships in one PR. The maintainer approved the design on the condition of minimal
shared-file changes; `design.md` records the resulting approach.
