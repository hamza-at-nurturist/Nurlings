# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves the proposal, `design.md` and its four decisions. Verify: explicit
  approval in the session. No code before this.

## 2. Shared plumbing

- [ ] 2.1 Move `avatar-illustration.ts` to `packages/ui-tokens` and import it from there in
  `ui-web`. Verify: `ui-web` and `ui-tokens` unit tests pass; the file is the only place with prop
  hex literals, and mobile files added by this change contain none.
- [ ] 2.2 Move `useAvatarState` and `useToolSwap` to the agreed shared package, re-export from
  `ui-web`. Verify: the moved tests pass in the new home and web tests still pass unchanged.
- [ ] 2.3 Mark the core functions mobile needs in worklets with `"worklet"` only where used. Verify:
  core unit tests unchanged and green.

## 3. States and pips

- [ ] 3.1 Derive state, working look and tool inside the organic mobile avatar from `status`,
  `composing`, `ticketStatus`, `asleep`, `progress` and `mobileLogoAvatarActivity.getLive`. A resting
  avatar adds no subscription. Verify: render tests per state with a mocked store: state attribute,
  pip color token, one subscription only while active.
- [ ] 3.2 Draw pips with the warning, destructive and success tokens, the glint, the blocked dull
  body, sleep z's and the long-run sweat drop; remove the working dot and typing-dot morph for
  organic avatars only. Verify: render tests; the logo set and photo avatars render as before.
- [ ] 3.3 Accessible names with the state ("Chief, working") and the agreed strings. Verify: tests
  for name and role, a nameless avatar stays hidden, and `i18n.test.ts` passes for every catalog.

## 4. Working looks and props

- [ ] 4.1 Orbit dot, ripples for queued runs, progress ring (built, unfed) and the long-run look with
  Reanimated. Verify: unit tests that the look follows `avatarWorking` for each status and tool, and
  the ring offset follows `progress`.
- [ ] 4.2 Pencil on notepad, magnifier and laptop (screen facing the Nurling) at the shared anchors,
  eyes settling on the prop. Verify: render tests for each tool and anchor position on two bodies.
- [ ] 4.3 Still rules: 24 pt and smaller and Reduce Motion render no props and no animation, only the
  pip; `static` avatars follow the agreed rule. Verify: render tests at 24, 25 and 54 pt with Reduce
  Motion on and off.
- [ ] 4.4 Calm gaze: no touch handling added; idle clips and blinks as today. Verify: a test that the
  avatar registers no gesture or pointer handler.

## 5. Surfaces

- [ ] 5.1 Pass `name` where the avatar is the only label (chat header, inbox rows) and check the
  other surfaces keep their current accessible names. Verify: component tests for the changed call
  sites.

## 6. Tool swap (last, independent)

- [ ] 6.1 Drive the prop drop (240 ms), blink and pop (500 ms) with ring burst from `useToolSwap`;
  a change mid-swap replaces the target. Verify: tests with fake timers for write to computer and a
  change during `out`; Reduce Motion switches at once.

## 7. Checks and pull request

- [ ] 7.1 Lint, typecheck and unit tests for touched packages; `openspec validate
  avatar-working-states-mobile --strict`. The desktop Playwright suite is not run locally.
- [ ] 7.2 Check on the iOS simulator if one is available and attach captures that show the change;
  otherwise say none were captured. Add a catalog flow only if approved.
- [ ] 7.3 Open the PR on `feature/avatar-working-states-mobile`: why, what, how tested, quoted
  copy, and the unfed states (in review, asleep, progress ring). Then follow `pr-watch`. Never merge
  without approval.
- [ ] 7.4 Archive the change after the PR merges.
