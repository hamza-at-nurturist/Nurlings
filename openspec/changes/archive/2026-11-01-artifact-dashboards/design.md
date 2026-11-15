# Design

The maintainer approved building this with as few edits to shared files as possible, so upstream
syncs stay easy. That rules out the first idea (a new `artifact_data` table, a new bot tool and a
new RPC), which touched about a dozen shared files and their tests. Live numbers instead use what
already exists.

## Live numbers

A dashboard keeps its numbers in a separate JSON artifact (for example `sales.json`) that the bot
attaches with the existing `attach_file`. To refresh, the bot attaches the JSON again under the same
name, which only adds a version of the data file; the dashboard artifact is untouched. No migration,
no new tool, no new RPC.

## Reading

The page runs in a sandboxed frame with an opaque origin and no network. It posts
`{ type: "nurlings:data", id, name }`. The static viewer shell forwards that request to the app
(only from its own preview frame) and forwards the app's `nurlings:data:result` reply back. The app
(`apps/web/src/lib/artifact-data-fork.ts`) answers using the user's own session: it finds the JSON
artifact with that name among the dashboard's own bot's artifacts, reads its latest version (at most
1 MB) and replies with the parsed value, or `null`. The page can only read, never write. The shell
CSP and the iframe `sandbox` attribute do not loosen. The page re-asks every 10 seconds itself.

Only the Artifacts tab wires this up; previews in chat get `null`.

## Where the code lives

New files: `artifact-data-fork.ts`. One-line hooks in `SandboxedHtmlViewer.tsx`, `Artifacts.tsx` and
the viewer shell script.
