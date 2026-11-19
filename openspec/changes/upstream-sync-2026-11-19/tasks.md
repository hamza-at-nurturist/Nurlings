# Tasks

## 1. Before the merge

- [x] 1.1 The resolution rules are the ones used for the Nov 14 sync (upstream's code; ours for
  brand, board, avatars, release and Coolify). Verify: this proposal's tables; flag any new area in
  the PR for review.

## 2. Merge

- [x] 2.1 Merge `upstream/main` with a merge commit; no conflict markers remain.
- [x] 2.2 Lockfile regenerated, installs frozen.
- [x] 2.3 `pnpm intl:extract` leaves the catalogs current; fork strings keep their translations,
  and the 40 fork board strings are translated for fr, he, hi, ko, pt-BR and tr.
- [x] 2.4 Fork files follow upstream's new layout (ticket RPCs, tool definitions, plugin links,
  boot watch, bot-panel expand, avatar imports).
- [x] 2.5 Apple Watch is not wired into the Expo config.
- [x] 2.6 CI runs the shared suites on GitHub's runners for pull requests.

## 3. Verify

- [x] 3.1 `tsc` passes in every package and app.
- [x] 3.2 `pnpm exec biome check .` passes.
- [x] 3.3 `pnpm exec vitest run` passes, except tests that also fail on upstream `main` in a
  sandbox without IPv6 loopback, Docker or Postgres (desktop runtime, host computer, MCP
  transport waits, local model proxy, and the image secret smoke).
- [x] 3.4 All migrations apply to an empty Postgres.
- [x] 3.5 `pnpm brand:check` passes, and `pnpm brand:check --built` passes after a web build.
- [x] 3.6 `openspec validate upstream-sync-2026-11-19 --strict` passes.
- [ ] 3.7 Open the PR; CI is green on the head commit.

## 4. After merge

- [ ] 4.1 Archive the change in a separate `chore/` PR.
