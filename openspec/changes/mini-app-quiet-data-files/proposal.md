# Proposal

## Why

A mini app reads its data from separate JSON files that the bot attaches, and the bot attaches them
again on every refresh. Each attach posts a file card in the chat, so the chat fills with data files
next to the one app the person wants to open.

## What Changes

- `attach_file` takes an optional `quiet` flag. A quiet attach stores the file and makes it a version
  of the same artifact as usual, but posts nothing in the chat.
- The Apps skill tells bots to attach data files quiet, and not to paste a file's JSON into a reply.

Not in this change: hiding data files from the Artifacts tab.

## Impact

- Capability: `mini-apps`. Tool: `attach_file` (new optional input only; no migration).
