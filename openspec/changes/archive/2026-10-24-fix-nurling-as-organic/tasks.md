# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves this proposal. Verify: explicit approval in the session.

## 2. Web

- [x] 2.1 `packages/ui-web/src/bot-avatar.tsx`: `OrganicAvatar` accepts an optional body (path scaled
  into the 120-unit box, no second outline to morph to) and pill eyes; `BotAvatar` routes shape 8
  through it. Remove the `ShapeEyes` animated branch and `EYE_UNIT`. Verify: unit tests that shape 8
  renders `rakazo-organic-avatar`, no ring, two idle and two working pills with the tilt, and
  `data-eye-pattern` seeded per bot; classic shapes render as before.
- [x] 2.2 `packages/ui-web/src/styles.css`: revert the `.rakazo-shape-eyes` selector widening.
  Verify: organic avatars unchanged (existing tests), grep finds no `rakazo-shape-eyes`.
- [x] 2.3 Update `apps/web/e2e/chief-avatar.spec.ts` and any studio spec that assumes shape 8 is not
  organic. Verify: e2e green in CI (not run locally on a maintainer machine).

## 3. Mobile

- [x] 3.1 `apps/mobile/components/bot-avatar.tsx`: `OrganicAvatar` takes the same optional body and
  eyes, shape 8 goes through it, and `ShippedShapeAvatar` drops its pill branch. Verify:
  `apps/mobile/lib/bot-avatar-render.test.tsx` covers shape 8 rendering through the organic path and
  classic shapes unchanged; mobile typecheck and unit tests.

## 4. Evidence

- [x] 4.1 Web screenshot of Chief idle and working next to a teardrop bot idle and working, from the
  real fixture, attached to the PR. Verify: maintainer sees them before merge.

## 5. Pull request

- [x] 5.1 Open the PR, wait for CI, merge when green after the maintainer has seen the screenshot.

## 6. After merge

- [x] 6.1 Archive this change.
