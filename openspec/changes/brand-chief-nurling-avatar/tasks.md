# Tasks

## 1. Approval

- [ ] 1.1 Maintainer approves this proposal, including the design (blob body without eye cut-outs,
  pill eyes at logo positions, navy circle, `::brand_chief` reserved value), the decision to skip
  a one-time DB migration for existing Chiefs, and the choice to not add new fields to
  `brand.json`. Verify: explicit approval in the session.

## 2. Contracts

- [ ] 2.1 In `packages/contracts/src/bot-avatar.ts`:
  - Add `{ kind: "brand-chief" }` to `ParsedBotAvatar`.
  - In `parseBotAvatarValue`: return `{ kind: "brand-chief" }` when `raw === "::brand_chief"`.
  - In `isBotAvatarValue`: accept `"::brand_chief"` as a valid value.
  - Verify: `pnpm --filter @rakazo/contracts test` passes with assertions for the new kind (add
    them in `packages/contracts/src/bot-avatar.test.ts`).

## 3. Web avatar component

- [ ] 3.1 Create `packages/ui-web/src/chief-avatar.tsx` with a `ChiefAvatar` component:
  - SVG with `viewBox="-60 -60 120 120"`, the same as `OrganicAvatar`.
  - A `<circle r="60" fill={brand.colors.iconBackground} />` background.
  - A `<path>` for the blob body: outer sub-path only (`brand.mark.blob.split("Z")[0] + "Z"`),
    scaled and centred via `<g transform="scale(0.0701) translate(-921.5, -1003)">`.
  - Fill with `brand.colors.blob` (`#FFFFFF`).
  - Two `<g>` eye groups (idle + working), each containing two pill rects centred at the logo eye
    positions (left ≈ (−0.1, −9.8), right ≈ (9.6, −7.6)) with ~13.5° clockwise tilt, using the
    same CSS classes (`rakazo-organic-avatar-eyes`, `rakazo-organic-avatar-eyes-idle`,
    `rakazo-organic-avatar-eyes-working`) as `OrganicAvatar`.
  - Set `data-eye-pattern="0"` (fixed pattern) and `data-working={isWorking}` on the SVG.
  - Working glow: `drop-shadow(0 0 …px #4FFFDB)` matching the orb gradient first stop.
  - Reduced motion: pass the same `reducedMotion` store check from `OrganicAvatar`.
  - Verify: `pnpm --filter @rakazo/ui-web typecheck` passes; snapshot test in
    `packages/ui-web/src/chief-avatar.test.tsx` renders without errors in idle and working states.

- [ ] 3.2 In `packages/ui-web/src/bot-avatar.tsx`:
  - Import `ChiefAvatar`.
  - In `parseBotAvatar` (the UI-side parser): handle `rawColor === "::brand_chief"` and return a
    new parsed shape `{ isBrandChief: true, isImage: false }`.
  - In `BotAvatar`: render `<ChiefAvatar size={size} isWorking={isWorking} className={className} />`
    when `parsed.isBrandChief` is true.
  - Verify: `pnpm --filter @rakazo/ui-web typecheck` passes; existing `bot-avatar.test.tsx` still
    passes.

- [ ] 3.3 In `packages/ui-web/src/index.ts`: export `ChiefAvatar`.
  - Verify: no type errors; no unused exports after the run.

## 4. Mobile avatar component

- [ ] 4.1 Create `apps/mobile/components/chief-avatar.tsx` with a `ChiefAvatar` component:
  - Uses `react-native-svg` (`Svg`, `Circle`, `Path`, `G`, `Rect`).
  - Background circle with `fill={brand.colors.iconBackground}` at radius 60.
  - Blob body `<Path>` with the same outer sub-path and `transform="scale(0.0701) translate(-921.5, -1003)"`.
  - Two eye rects rendered via `useAnimatedProps` + `AnimatedRect` (the same pattern as
    `OrganicAvatar` in `apps/mobile/components/bot-avatar.tsx`), using the Chief eye centres and
    slant.
  - Accepts `life: AvatarLife` (passed from the parent `BotAvatar`).
  - Verify: TypeScript compiles; no import errors.

- [ ] 4.2 In `apps/mobile/lib/bot-avatar.ts`:
  - Add `{ kind: "brand-chief" }` to `MobileBotAvatarPresentation`.
  - In `mobileBotAvatarPresentation`: return `{ kind: "brand-chief" }` when the contracts parser
    returns `kind === "brand-chief"`.
  - Verify: `pnpm --filter @rakazo/mobile typecheck` passes (or the package's typecheck script).

- [ ] 4.3 In `apps/mobile/components/bot-avatar.tsx`:
  - Import `ChiefAvatar`.
  - Add `parsed.kind === "brand-chief"` branch that renders `<ChiefAvatar life={life} size={size} />`.
  - Verify: TypeScript compiles; no runtime import errors.

## 5. Sign-up flow

- [ ] 5.1 In `apps/web/src/pages/Onboarding.tsx`, `createOrReuseFirstBot`:
  - Add `color: "::brand_chief"` to the `rpc.bots.create` input object.
  - Verify: TypeScript compiles; the onboarding E2E (`apps/web/e2e/golden.spec.ts`) shows the
    Chief avatar rendered correctly on the first run.

## 6. Guard: unknown-kind fallback

- [ ] 6.1 Confirm that `parseBotAvatar` in `bot-avatar.tsx` (web) and `mobileBotAvatarPresentation`
  (mobile) already fall back gracefully for any `kind: "other"` value from the contracts parser
  (they already do — the `other` kind hits the organic-avatar branch). Add a test in
  `packages/ui-web/src/bot-avatar.test.tsx` asserting that `parseBotAvatar("::brand_chief")` does
  not return `isImage: true` or `shapeIndex`.
  - Verify: test passes.

## 7. Validate

- [ ] 7.1 `pnpm --filter @rakazo/contracts test`, `pnpm --filter @rakazo/ui-web test`, and
  `pnpm typecheck` (root) all pass.
- [ ] 7.2 `openspec validate brand-chief-nurling-avatar --strict` passes.

## 8. Pull request

- [ ] 8.1 Open the PR. Description quotes all user-facing copy added (none beyond the new avatar
  visual, which has no label). Links the CI E2E screenshot showing Chief at idle state (the
  screenshot fixture in `apps/web/e2e/fixtures/marketing-shots.tsx` or the golden spec should
  capture Chief).
  - Verify: `pr-digest --watch` reports terminal green CI checks; no review comments remain.

## 9. After merge

- [ ] 9.1 Archive this change.
