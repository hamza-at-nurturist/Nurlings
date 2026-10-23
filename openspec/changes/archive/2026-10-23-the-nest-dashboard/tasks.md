# Tasks

> Scope: phase 1 only (cards, eyes badge, read-only Needs you tray). Anything under "Future ideas"
> in the proposal is out of scope and gets no code, fields or endpoints.

## 1. Approval

- [x] 1.1 Maintainer approves the proposal; sleeping = idle, no armed routine, no run in 24 h;
  mood named "Needs you"; menu entry at `/app/nest`; phase 1 only. Verify: explicit approval in
  the session.

## 2. Backend and shared logic

- [x] 2.1 Add `packages/core/src/nest-mood.ts` (pure function) and export it. Verify: table-driven
  unit test covering every run status, error, precedence, and the sleeping boundary (with and
  without an armed routine, just inside and outside 24 h).
- [x] 2.2 Add `packages/contracts/src/nest.ts` (mood enum, snapshot schema with `nurlings` and
  `needsYou`), export it, and add `nest.snapshot` to `rpc.ts`. Verify: contract test parses a full
  payload and rejects an unknown mood.
- [x] 2.3 Add `apps/api/src/nest.ts` and the delegating handler in `router.ts`. Verify: unit tests
  with the repo's prisma test doubles for caller scoping, archived bots excluded, current task
  from the active run, `watch` routines and inactive routines ignored for "next routine", ask
  kinds, secret asks returned without text. No Postgres test: the queries are plain Prisma reads
  covered by the stubbed unit tests.

## 3. Web

- [x] 3.1 Add the eyes badge component with five moods and reduced-motion handling. Verify:
  component test for the accessible name per mood and no animation under reduced motion.
- [x] 3.2 Add `Nest.tsx` with separate `NeedsYouTray` and `NurlingGrid` section components, the
  lazy route, and the `SidebarFooter` / `Shell` menu entry. Verify: web tests against a mocked
  snapshot (cards, tray hidden when empty, links open the right thread, group asks); Lingui
  extract run.
- [x] 3.3 Poll every 3 s only while visible, skipping a tick while a request is in flight. Verify: web test with
  fake timers for hidden tab, focus refresh, and no overlapping requests.
- [x] 3.4 Add a Playwright spec that opens `/app/nest`, checks the card, the mood badge and the
  Working state, and follows a card to its thread. Verify: CI web E2E passes and its screenshot
  is linked on the PR.

## 4. Checks and wrap-up

- [x] 4.1 Lint, typecheck, unit tests, brand and i18n guards, and
  `openspec validate the-nest-dashboard --strict` pass locally and in CI.
- [x] 4.2 After merge, archive the change. Verify: archive output lists the `the-nest` capability.
