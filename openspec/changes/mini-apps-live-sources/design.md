# Design

## Decision 1: the server calls the tool, not the page and not the bot

The page never talks to an MCP server and never holds a credential. It asks the API for
`readSource({ artifactId, key })`. The API loads the app artifact, finds the source by key, and
calls the tool through the same installed-connector path a bot run uses, so credentials, egress
rules, redaction and size limits are reused, not copied.

## Decision 2: who may trigger a call

The caller must be able to open the artifact (same space check the Artifacts tab uses). The call
runs as the artifact's bot, with that bot's connectors only. A source cannot name a server the bot
does not have, so a shared app cannot reach into another bot's tools.

## Decision 3: reads only, enforced twice

At attach time the bot is told why a source is refused. At read time the API checks again, because
the file or the tool's declaration may have changed. A tool runs only when the existing tool gate
would let the bot run it without asking: it is declared read-only and its approval setting is not
"ask". Anything else returns an error and the app keeps its last data.

## Decision 4: cost control

Results are cached per artifact version and key for `every` seconds, so ten viewers cost one tool
call. `every` has a floor of 10 seconds. Results over 1 MB are refused, as for data files. The
page stops polling while hidden.

## Decision 5: static arguments only

`args` is fixed JSON in the file. Arguments driven by UI state (a search box feeding the tool) are
a follow-up; the table already filters client-side.

## Failure behaviour

A failed poll keeps the last good data and adds no visible copy. A source that has never loaded
shows empty, as a missing data file does today.
