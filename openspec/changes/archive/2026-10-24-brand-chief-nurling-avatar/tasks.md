# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the redirect to a shape-system entry (no disc, no
  custom glow, no reserved value). Verify: explicit approval in the session.

## 2. Brand data

- [x] 2.1 Add `blobBody`, `eyeLeft`, `eyeRight`, `eyeAngleDeg`, `eyeWidth`, `eyeLength` to
  `packages/brand/brand.json` and validate them in `packages/brand/src/schema.ts`.
  Verify: `pnpm --filter @nurlings/brand check` and brand tests pass.

## 3. Shape system

- [x] 3.1 Append `nurling` to `SHIPPED_BOT_AVATAR_SHAPE_KEYS` with the blob outline moved into the
  shape box, and add `shippedBotAvatarEyes` (ellipses by default, tilted pills for `nurling`).
  Verify: shape tests pin the bounding box, centring and eye placement.
- [x] 3.2 Set `BOT_AVATAR_SHAPE_COUNT` to 9 in `packages/contracts`. Verify: the core and
  contracts tests agree on the count.

## 4. Rendering

- [x] 4.1 Web: draw eyes from `shippedBotAvatarEyes` in `BotAvatar` and `BotShapePreview`.
- [x] 4.2 Mobile: draw and animate the pill eyes in `ShippedShapeAvatar`.
  Verify: unit tests for both; typecheck passes.

## 5. Sign-up

- [x] 5.1 Create the first bot in `Onboarding.tsx` with the default avatar colour and the
  `nurling` shape.

## 6. Verify

- [x] 6.1 Web e2e spec `apps/web/e2e/chief-avatar.spec.ts` renders the real avatars (Chief and
  regular shapes, idle and working, light and dark, 36/42/54/200) and the shape picker, and attaches
  the screenshot.
- [x] 6.2 Add the `user-facing-branding` spec delta and run
  `openspec validate brand-chief-nurling-avatar --strict`.

## 7. Pull request

- [x] 7.1 Maintainer approves the screenshot, then merge.

## 8. After merge

- [x] 8.1 Archive this change.
