# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the resolutions above. Verify: explicit approval in the session.

## 2. Merge

- [x] 2.1 Merge `upstream/main` with a merge commit and resolve the conflicts as listed. Verify: no
  conflict markers remain and `git log` shows upstream's commits.
- [x] 2.2 Keep the brand seam: desktop `t`, mobile `t` and `emailText` rebrand the template; nothing
  upstream is edited in catalogs. Verify: `pnpm brand:check` and, after a web build,
  `pnpm brand:check --built` pass.
- [x] 2.3 Confirm what we keep survived: `NUR` prefix, billing off, `#hex::shape_N`, "Run actions
  without asking" default OFF, bot-panel expand, ticket memory tag. Verify: their existing tests pass.

## 3. Verify

- [x] 3.1 `pnpm install --frozen-lockfile`, lint, typecheck and unit tests pass locally, except tests
  that need Docker or IPv6 loopback, which this sandbox lacks.
- [x] 3.2 `openspec validate upstream-sync-2026-11-02 --strict` passes.
- [x] 3.3 Open the PR; CI is green on the head commit (the desktop e2e runs in CI, not locally).
  Verify: `pr-digest --watch` reports terminal green checks.

## 4. After merge

- [x] 4.1 Archive the change.
