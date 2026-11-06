## 1. File format

- [ ] 1.1 Add `sources` to the shared mini app reader (shape, key rules, interval bounds, 10 to 3600 seconds) with reasons for each mistake
- [ ] 1.2 Unit tests for the reader

## 2. Server

- [ ] 2.1 `miniApps.readSource` route: access check, source lookup, bot-scoped connector call, read-only gate, 1 MB cap, redaction
- [ ] 2.2 Shared per-interval cache keyed by artifact version and source key
- [ ] 2.3 Attach and write checks: missing server or tool, not read-only, would ask
- [ ] 2.4 Deterministic tests with a fake MCP connector

## 3. App

- [ ] 3.1 Viewer polls sources while visible, keeps last good data on error
- [ ] 3.2 Viewer test with a fake source

## 4. Skill

- [ ] 4.1 Apps skill: when to use a source, the file shape, one tested example
- [ ] 4.2 Skill examples validated against the reader

## 5. Verify

- [ ] 5.1 `openspec validate mini-apps-live-sources --strict`
- [ ] 5.2 Live check on `edge` with a connected MCP server
- [ ] 5.3 Archive after merge
