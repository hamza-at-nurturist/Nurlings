# Tasks

> Nothing is committed before the maintainer approves this proposal (task 1.1).

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal and answers the open questions (sleeping definition,
  mood label, menu placement). Verify: explicit approval in the session.

## Phase 1: cards, eyes badge, tray (read-only)

- [ ] 2.1 Add `packages/contracts/src/nest.ts` (snapshot schema, mood enum) and export it; add
  `nest.snapshot` to `rpc.ts`. Verify: contract test parses a full payload and an older one with
  missing optional fields.
- [ ] 2.2 Add `packages/core/src/nest-mood.ts` and export it. Verify: table-driven unit test for
  every status, precedence and the sleeping threshold.
- [ ] 2.3 Add `apps/api/src/nest.ts` (bots with latest run, current task, next routine, waiting
  asks with secret redaction) and the delegating handler in `router.ts`. Verify: unit tests with
  the repo's prisma test doubles for scoping to the caller's space, archived bots excluded,
  `watch` routines ignored for "next", secret asks redacted; a `*.postgres.test.ts` for the
  queries.
- [ ] 2.4 Add the eyes badge component from the brand mark geometry, with the five moods and
  reduced-motion handling. Verify: component test for the accessible name per mood and no
  animation class under reduced motion.
- [ ] 2.5 Add `Nest.tsx` and `components/nest/*` (grid, card, tray), the lazy route, and the menu
  entry. Verify: web test opens the page against a mocked snapshot; Lingui extract run.
- [ ] 2.6 Poll every 3 s while visible with the stale-response guard. Verify: web test with fake
  timers for hidden tab, focus refresh and out-of-order responses.
- [ ] 2.7 Add a Playwright spec that opens `/app/nest` with seeded Nurlings in each mood. Verify:
  CI E2E passes and its screenshot is linked on the PR.
- [ ] 2.8 Build and brand checks. Verify: `pnpm` lint, typecheck, unit tests and the brand/i18n
  guards pass; `openspec validate the-nest-dashboard --strict`.

## Phase 2: answer in place, today's stats

- [ ] 3.1 Tray actions call `threads.answer` for asks with explicit actions; secret, login and
  takeover items only open the thread. Verify: web test for answered, failed and already-answered
  races; no new endpoint.
- [ ] 3.2 Add `today` stats (done, failed, routine runs, tokens) to the snapshot for the user's
  local day. Verify: unit tests around midnight in two timezones and null token rows.

## Phase 3: timeline and live signal

- [ ] 4.1 Add the `timeline` to the snapshot (ran, failed, running, next, check) using the cron
  helpers, capped per routine. Verify: unit tests for multi-cron, one-shot, `watch` and DST days.
- [ ] 4.2 Render the timeline. Verify: web test and updated E2E screenshot.
- [ ] 4.3 Only if polling proves too chatty: add `nest.subscribe` modelled on `boards.subscribe`.
  Verify: contract test and a fanout test that a run change yields one frame.

## 5. Wrap-up

- [ ] 5.1 After merge, archive the change. Verify: `openspec archive` output lists the new
  `the-nest` capability.
