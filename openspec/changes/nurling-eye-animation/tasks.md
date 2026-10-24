# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves this proposal, including whether the eight classic shapes are in or
  out. Verify: explicit approval in the session.

## 2. Web eyes

- [ ] 2.1 `packages/ui-web/src/styles.css`: widen the eye selectors (idle patterns, working set,
  opacity swap, reduced motion) from `.rakazo-organic-avatar` to also match `.rakazo-shape-eyes`;
  keyframes untouched. Verify: organic avatars render and animate as before.
- [ ] 2.2 `packages/ui-web/src/bot-avatar.tsx`: for the nurling shape, add the host class, `data-working`
  and `data-eye-pattern` (seed % 4) to the shape svg, and draw the pills as idle and working groups
  inside a 259/120 scale wrapper with `transform-box: fill-box; transform-origin: center`.
  `BotShapePreview` stays static. Verify: unit tests for the classes and attributes, and that other
  shapes are unchanged.

## 3. Mobile

- [ ] 3.1 Confirm `ShippedShapeAvatar` already animates the pills (blink, look, working); no code
  change expected.

## 4. Evidence

- [ ] 4.1 Extend `apps/web/e2e/chief-avatar.spec.ts`: the nurling's eyes animate while idle and
  stop under reduced motion, and the working group shows while working.
- [ ] 4.2 A GIF of Chief idle and working next to an organic avatar, built from timed screenshots of
  the real fixture, attached to the PR.

## 5. Pull request

- [ ] 5.1 Maintainer approves the GIF, then merge.

## 6. After merge

- [ ] 6.1 Archive this change.
