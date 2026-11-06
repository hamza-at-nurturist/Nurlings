## ADDED Requirements

### Requirement: Mini apps read live data from MCP tools

A mini app file SHALL be able to declare `sources`, each naming a tool of an MCP server the app's bot has, with fixed arguments and a refresh interval. The result SHALL be available to the app at `/data/<key>`.

#### Scenario: A source feeds a table

- **WHEN** an app declares a source `deals` for a read-only tool and a table reads `/data/deals`
- **THEN** the table shows the tool's current result and refreshes at the declared interval while visible

#### Scenario: Viewers share a call

- **WHEN** several people have the same app open
- **THEN** the tool runs once per interval, not once per viewer

### Requirement: Sources run read-only tools only

The server SHALL run a source's tool only when the tool is declared read-only and the bot may use it without asking. It SHALL refuse a source whose server or tool is missing, or that is not allowed, when the bot attaches the app, and SHALL check again on every read.

#### Scenario: Refused at attach

- **WHEN** a bot attaches an app whose source names a tool that writes
- **THEN** the attach fails with a reason naming the tool

#### Scenario: Never exceeds the bot's tools

- **WHEN** a source names a server the bot does not have
- **THEN** the read fails and no tool runs

### Requirement: A failed refresh keeps the last data

When a refresh fails, the app SHALL keep showing the last data it received.

#### Scenario: Server error

- **WHEN** a poll returns an error after an earlier success
- **THEN** the app still shows the earlier data
