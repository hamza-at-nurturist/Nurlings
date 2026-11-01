# Design

## Storage
Table `artifact_data`: `id`, `spaceId`, `familyId` (root artifact id, cascade on delete), `key`,
`value` (JSON, capped at 64 KiB per key, 50 keys per artifact), `updatedAt`; unique on
(`familyId`, `key`); row level security like `artifacts`. A new table, so the previous release's
code keeps working during deploy.

## Writing
New bot tool `artifact_data_set` takes the artifact `name` (as `attach_file` does) and a `key` and
`value`. It resolves the bot's artifact family by name and upserts. It needs no approval beyond
what `attach_file` needs, since it only writes inside the bot's own artifact.

## Reading
The page runs in a sandboxed frame with an opaque origin and no network. It asks its host for data
with `postMessage({ type: "nurlings:data" })`. The viewer shell relays the request to the web app,
which calls a new authenticated RPC `artifacts.data` for that family and posts the values back.
The page can read, never write, and only for its own family. The web app re-asks every 10 seconds
while visible. The shell's CSP and the iframe `sandbox` attribute do not loosen.

## Open question
Whether the shell relay is enough or the API should serve the values inside the frame; the relay is
proposed because it keeps the page offline.
