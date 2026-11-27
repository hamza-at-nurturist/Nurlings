# Tasks

## 1. Before the merge

- [x] 1.1 The resolution rules are the ones used for the Nov 14 and Nov 19 syncs (upstream's code;
  ours for brand, board, avatars, release and Coolify). Verify: this proposal's tables; flag any
  new area in the PR for review.

## 2. Merge

- [x] 2.1 Merge `upstream/main` with a merge commit; no conflict markers remain.
- [x] 2.2 Lockfile regenerated, installs frozen.
- [x] 2.3 `pnpm intl:extract` leaves the catalogs current; fork strings keep their translations.
- [x] 2.4 Fork files follow upstream's layout (memory tools, board pages, mention picker, settings,
  first bot, desktop auth).
- [x] 2.5 Skipped or neutralised items are as listed in the proposal; no upstream link or name ships.
- [x] 2.6 Lifecycle emails send the fork's own English wording when no copy folder is set.
- [x] 2.7 New environment keys are in `deploy/coolify/docker-compose.yml`; the compose-env test passes.

## 3. Verify

- [ ] 3.1 `tsc` passes in every package and app.
- [ ] 3.2 `pnpm exec biome check .` passes.
- [ ] 3.3 `pnpm exec vitest run` passes, except tests that also fail on upstream `main` in a sandbox
  without IPv6 loopback, Docker or Postgres.
- [ ] 3.4 All migrations apply to an empty Postgres.
- [ ] 3.5 `pnpm brand:check` passes, and `pnpm brand:check --built` passes after a web build.
- [ ] 3.6 `openspec validate upstream-sync-2026-11-27 --strict` passes.
- [ ] 3.7 Open the PR; CI is green on the head commit.

## 4. After merge

- [ ] 4.1 Archive the change in a separate `chore/` PR.
