# Proposal

## Why

People who run a business on Nurlings still jump between the tools their bots are connected to.
Bots already reach those tools through MCP and can already save dashboards, but a dashboard is a
page of HTML: it looks different every time, cannot act, and cannot be edited precisely. The goal
is one screen where a person works (their pipeline, today's follow-ups, a deal) built by asking a
bot, while the connected tools stay the system of record.

## What Changes

A bot can save a mini app: a small JSON description of screens, drawn by Nurlings with its own
components. This first version is web only and has no new backend.

- **App file.** An artifact named `<name>.app.json` holds a json-render spec (the library's flat
  element map) and the names of the JSON data artifacts it reads. The bot fetches the data through
  its MCP connections and saves it as ordinary JSON artifacts, as dashboards already do.
- **Viewer.** The Artifacts viewer draws an app file with a fixed catalog of components (stack,
  heading, text, badge, stat, table, button) built on the app's own tokens. A spec that uses
  anything outside the catalog is refused with a short message instead of drawn.
- **Live data.** The app re-reads its data artifacts every 10 seconds, so the bot refreshes the
  numbers by saving the data again.
- **Actions.** A button can run one action, `askBot`, which puts a message in that bot's composer
  and opens its chat. Nothing is sent until the person presses Send, so anything that reaches an
  outside person or writes to a connected tool still goes through the bot and its approvals.
- **Bot guidance.** A built-in "Apps" skill teaches bots the format and a lead pipeline example.

Not in this change: mobile and desktop renderers, queries or writes run by the server, per-app
state, formulas, a database table for apps, sharing.

## Impact

- Capability: new `mini-apps`.
- Adds `@json-render/core` and `@json-render/react` (Apache-2.0, Vercel Labs, exact versions).
  Only their core and React packages are used, not the library's shadcn catalog or its optional
  hosted-model helpers. The stored format is the library's spec, so a later swap needs a converter.
- Web only. No migration, no API change, no new image.
