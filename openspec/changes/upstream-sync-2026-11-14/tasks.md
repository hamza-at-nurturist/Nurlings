# Tasks

## 1. Before the merge

- [x] 1.1 The resolution rules are the ones approved for the Nov 6 sync (upstream's code; ours for
  brand, board, avatars, release and Coolify). Verify: this proposal's tables; flag any new area in
  the PR for review.

## 2. Merge

- [x] 2.1 Merge `upstream/main` with a merge commit; no conflict markers remain.
- [x] 2.2 Lockfile: upstream's, then `pnpm install --lockfile-only`, then `--frozen-lockfile`.
- [x] 2.3 `pnpm intl:extract` leaves no fork string untranslated where we had a translation, and the
  catalogs are current.
- [x] 2.4 Mobile board and avatar screens use Lingui; the web and mobile avatar pickers offer the 14
  shapes.
- [x] 2.5 Board gating follows the labs model (date reminders, mention wakes, tools).

## 3. Verify

- [x] 3.1 `tsc` passes in every package and app.
- [ ] 3.2 `pnpm exec biome check .`, `pnpm exec vitest run` pass, except tests that also fail on
  upstream `main` in a sandbox without IPv6 loopback, Docker or Postgres.
- [ ] 3.3 All migrations apply to an empty Postgres (CI).
- [x] 3.4 `pnpm brand:check` and, after a web build, `pnpm brand:check --built` pass.
- [x] 3.5 `openspec validate upstream-sync-2026-11-14 --strict` passes.
- [ ] 3.6 Open the PR; CI is green on the head commit.

## 4. After merge

- [ ] 4.1 Archive the change in a separate `chore/` PR.
