# Tasks

## 1. Approval

- [x] 1.1 Maintainer asks for a minimal web version of the mini apps idea built on json-render.
  Verify: explicit request in the session.

## 2. Build

- [x] 2.1 Add the pinned json-render packages. Verify: lockfile diff contains only them.
- [x] 2.2 Catalog, registry and viewer with strict validation and the `askBot` action. Verify:
  unit tests cover a valid app, an unknown component, bad JSON and the oversize limit.
- [x] 2.3 Refresh data every 10 seconds and tolerate missing data. Verify: unit test with a
  changing loader.
- [x] 2.4 Open `.app.json` artifacts in the Artifacts viewer. Verify: unit test of the viewer
  choice.
- [x] 2.5 Built-in "Apps" skill with the format and a lead pipeline example. Verify: skill
  tests pass and the example validates against the catalog.
- [x] 2.6 End-to-end fixture page and spec with a screenshot of the lead pipeline. Verify: spec
  passes in CI.

## 3. After merge

- [ ] 3.1 Archive the change.
