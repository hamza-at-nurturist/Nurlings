# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and `design.md`, including the 3-minute long-run
  threshold, the ripple rule for queued runs, and the mobile split. Verify: explicit approval in the
  session. No code before this.

## 2. Shared model

- [x] 2.1 Add `AvatarState`, `avatarState(input)`, `avatarMotionState`, `avatarWorking`,
  `AVATAR_LONG_RUN_MS`, `AVATAR_DONE_MS` to `packages/core/src/avatar-life.ts`. Verify: new cases in
  `avatar-life.test.ts` for every row of the mapping table, background runs, the settle window, and
  the long-run clock restarting after leaving working.
- [x] 2.2 Add `avatarToolSwap` and the swap timings. Verify: tests for rest to out to in to rest, a
  change mid-swap replacing the target, swaps to and from `none`.
- [x] 2.3 Add the shake detector (`createShakeDetector`) to core as pure code. Verify: tests with
  scripted pointer paths: six quick turns inside 900 ms fire, slow or small moves do not, turns
  older than 900 ms expire.

## 3. Backend tool mapping

- [x] 3.1 Add `AVATAR_TOOL_CATEGORY` and `avatarToolCategory(name)` to core. The tool-called payload is
  an untyped record in `packages/contracts`, so `tool` needs no schema change. Verify: map tests per
  category, unknown and MCP names give none, and a test that every mapped name exists in the
  registered tool names.
- [x] 3.2 Stamp `tool` in `run-turn.ts` `onToolCalled`; carry it through the web activity
  projection. Verify: an adapters test that the appended event has the field for a mapped tool and
  not for an unmapped one; a projection test; old events without the field read as none.

## 4. Web renderer

- [x] 4.1 Add `ui-web/src/avatar-illustration.ts` (prop colors, with the comment) and the gloss arc
  for bodies that lack one. Verify: unit test that every body has a gloss path; a grep-based check
  that no other new file in the change has a hex literal.
- [x] 4.2 Draw states, pips, glint and working variants on the organic avatar, with accessible names
  that include the state. Verify: `bot-avatar.test.tsx` per state: class, pip token, role and name;
  24px and reduced-motion render no props or animation.
- [x] 4.3 Draw the three props with shadows and sheen, and the tool swap. Verify: tests that the
  swap sequence adds and removes the `out` and `in` classes at 240 ms and 500 ms with fake timers.
- [x] 4.4 Add the shared pointer controller and dizzy. Verify: tests that N avatars add one listener,
  the last unmount removes it, a burst of moves causes at most one frame update and zero React
  renders, dizzy sets and clears after 2.4 s, and asleep and thinking stay out.
- [x] 4.5 Feed state and tool from activity and status to the avatars the app composes. Verify:
  component tests in `apps/web` for the chat header and the sidebar rows.

## 5. Screenshot and checks

- [x] 5.1 Add a web E2E fixture and spec that shows avatars in each state, the three props and the
  progress ring at 96 and 24 px. No shared-tooling flags. Verify: spec passes in CI and the PR
  embeds its screenshot.
- [x] 5.2 Run `pnpm --filter @rakazo/web intl:extract` if any string was added. Verify: no diff
  in `apps/web/src/locales`.
- [x] 5.3 Lint, typecheck and unit tests for touched packages. The desktop Playwright suite is not run
  locally.

## 6. Pull request

- [x] 6.1 Open the PR on `feature/avatar-working-states`; the description says why, what and how it
  was tested, quotes any new copy, and states the mobile split and the cursor degrade. If `gh` is
  unauthenticated, say so and use the GitHub tools.
- [x] 6.2 Stay with the PR until CI is green and review comments are handled; never merge without
  approval.
- [ ] 6.3 Archive the change after the PR merges. Open the mobile change next.
