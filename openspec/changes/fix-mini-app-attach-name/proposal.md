# Proposal

## Why

A bot that attaches a mini app under a friendly name such as "Demo CRM" stores it without the
`.app.json` suffix. The chat card then opens as plain JSON and downloads, and the file check
skips it, so the person never sees the app.

## What Changes

- `attach_file` keeps the `.app.json` suffix on a mini app file when the bot gives it a name
  without one, and checks the file under that name.

## Impact

- Capability: `mini-apps`. Tool: `attach_file` (no schema change, no migration).
