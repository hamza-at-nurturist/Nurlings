# Proposal

## Why

Nurlings tell people where their files live by quoting server folders and internal IDs in chat
replies and ticket comments, for example "it lives in my bot folder" followed by a long path. The
people using the product are not technical, so the path is noise at best, and it exposes internal
layout the product should not show.

## What Changes

- One guidance line joins the Nurling's base instructions for every run, chat and ticket alike:
  never mention file system paths, folders or internal IDs to the user; refer to files by name and
  attach anything the user should have; if attaching fails, say so and offer to retry, without a
  path.
- The line lives in a new file and is applied where the runtime builds the system prompt, so it
  reaches chat and ticket runs alike. `executor.ts` is not touched.
- A test pins that the line is present for both the computer and the sandbox-only prompts.

Not changed: the workspace and folder instructions the Nurling itself relies on, the tools, and any
file handling. This only changes what the Nurling says to the user.

### Upstream merge safety

New file `packages/adapters/src/user-facing-guidance.ts`. One existing upstream file is edited:
`packages/adapters/src/pi-runtime.ts`, a few lines where the system prompt is assembled.

## Impact

- Capability: none of the existing specs describe model prompts, so there is no spec delta.
- No migration, no API change, no new user-facing words in the interface.
