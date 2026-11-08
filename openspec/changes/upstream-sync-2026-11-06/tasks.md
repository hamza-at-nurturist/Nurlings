# Tasks

## 1. Before the merge

- [x] 1.1 Maintainer approves the resolutions above. Verify: explicit approval in the session.
- [x] 1.2 The Expo patch bump and the mini-app move have landed on `main`. Verify: both PRs merged.
- [x] 1.3 On `main`, the board, ticket, artifact and dashboard tests pass and every migration applies
  to an empty Postgres. Verify: record the file list and result.

## 2. Merge

- [x] 2.1 Merge `upstream/main` with a merge commit and resolve the conflicts as listed. Verify: no
  conflict markers remain and `git log` shows upstream's commits.
- [x] 2.2 Lockfile: upstream's, then `pnpm install --lockfile-only`, then `--frozen-lockfile`.
- [x] 2.3 `packages/page-kit` is in the Dockerfile COPY list.
- [x] 2.4 Re-run `intl:extract` so the fork's strings are in every catalog.
- [x] 2.5 Artifacts tab defaults to "Made by bots"; dashboards still load their JSON data.

## 3. Verify

- [x] 3.1 The same board, ticket, artifact and dashboard tests pass; any test changed because an
  upstream API changed is listed in the PR.
- [x] 3.2 `pnpm install --frozen-lockfile`, biome, `pnpm check`, `pnpm exec vitest run` pass, except tests that also fail on
  upstream `main` in a sandbox without IPv6 loopback or Docker.
- [x] 3.3 All migrations apply to an empty Postgres.
- [x] 3.4 `pnpm brand:check` and, after a web build, `pnpm brand:check --built` pass; no
  user-facing "Rakazo" or upstream-only URL in the tree or built output.
- [x] 3.5 `openspec validate upstream-sync-2026-11-06 --strict` passes.
- [ ] 3.6 Open the PR; CI is green on the head commit (desktop e2e runs in CI only).

## 4. After merge

- [ ] 4.1 Archive the change in a separate `chore/` PR.
