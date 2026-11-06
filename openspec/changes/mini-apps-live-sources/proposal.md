# Proposal

## Why

A mini app only shows data a bot copied into a JSON file, so it is as fresh as the last model run.
A CRM, inbox or ticket board should show what the connected tool holds now. Refreshing by waking
the bot every few minutes costs a model run each time and still lags.

## What Changes

- A mini app file may declare `sources`: `{ key, server, tool, args, every }`. Each source is a
  read-only tool of an MCP server the bot already has. Its result is available to the app at
  `/data/<key>`, like a data file today.
- The server runs the tool itself, with no model in the loop, as the bot's own connection. The app
  polls that endpoint every `every` seconds (10 minimum, 30 default) while its tab is visible.
  Viewers of the same app share one call per interval.
- Only read-only tools run. A source naming a tool that is missing, not read-only, or one the bot
  must ask about is refused with a reason the bot can act on, when it attaches the app.
- The Apps skill teaches bots to prefer a source over copying data into a file.

Not in this change: buttons that call tools (writes and actions), arguments built from what the
person typed in the app, webhooks or push updates.

## Impact

- Capability: `mini-apps`. New API route `miniApps.readSource`; no migration; no new built-in tool.
- Security-sensitive: the route runs a connector tool for a viewer. See design.
