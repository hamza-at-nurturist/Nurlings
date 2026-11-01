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
2. **Live numbers.** An artifact keeps a small set of named values. A bot updates them with a new
   tool, and the open dashboard re-reads them, so refreshing data no longer creates a new version.
   The page never receives credentials and never reaches the network itself; the backend owns
   authorization and storage.
3. **Per-artifact storage.** The named values live in a new table owned by the artifact family.
4. **Uploads hidden by default.** The Artifacts screen gets an "Uploads" toggle, off by default,
   that hides files people uploaded (items with no run) so the list shows what bots made.

Sharing and comments are out of scope.

## Delivery

Steps 1 and 4 ship first. Steps 2 and 3 touch the HTML sandbox boundary and add a migration, so
they ship after the maintainer approves `design.md`.
