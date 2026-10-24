# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves this proposal, including the design (blob body without eye cut-outs,
  pill eyes at logo positions, navy circle, `::brand_chief` reserved value), the decision to skip
  a one-time DB migration for existing Chiefs, and the choice to add explicit fields to
  `brand.json`. Verify: explicit approval in the session.

## 2. Contracts

- [x] 2.1 In `packages/contracts/src/bot-avatar.ts`:
  - Add `{ kind: "brand-chief" }` to `ParsedBotAvatar`.
  - In `parseBotAvatarValue`: return `{ kind: "brand-chief" }` when `raw === "::brand_chief"`.
  - In `isBotAvatarValue`: accept `"::brand_chief"` as a valid value.
  - Verify: `pnpm --filter @rakazo/contracts test` passes with assertions for the new kind (add
    them in `packages/contracts/src/bot-avatar.test.ts`).

## 3. Web avatar component

- [x] 3.1 Create `packages/ui-web/src/chief-avatar.tsx` with a `ChiefAvatar` component:
  - SVG with `viewBox="-60 -60 120 120"`, the same as `OrganicAvatar`.
  - A `<circle r="60" fill={brand.colors.iconBackground} />` background.
  - A `<path>` for the blob body via `brand.mark.blobBody` (new explicit field),
    scaled and centred via `<g transform="scale(0.0701) translate(-921.5, -1003)">`.
  - Fill with `brand.colors.blob` (`#FFFFFF`).
  - Two `<g>` eye groups (idle + working), each containing two pill rects centred at the logo eye
    positions read from `brand.mark.chiefEyeLeft/Right` with tilt `brand.mark.chiefEyeAngleDeg`,
    using the same CSS classes as `OrganicAvatar`.
  - Set `data-eye-pattern="0"` and `data-working={isWorking}` on the SVG.
  - Working glow: `drop-shadow(0 0 …px #4FFFDB)`.
  - Reduced motion: pass the same `reducedMotion` store check.
  - Verify: `pnpm --filter @rakazo/ui-web typecheck` passes; tests pass.

- [x] 3.2 In `packages/ui-web/src/bot-avatar.tsx`:
  - Import `ChiefAvatar`.
  - In `parseBotAvatar`: handle `rawColor === "::brand_chief"` and return `{ isBrandChief: true, isImage: false }`.
  - In `BotAvatar`: render `<ChiefAvatar …>` when `parsed.isBrandChief` is true.
  - Verify: typecheck passes; existing tests pass.

- [x] 3.3 In `packages/ui-web/src/index.ts`: export `ChiefAvatar`.

## 4. Mobile avatar component

- [x] 4.1 Create `apps/mobile/components/chief-avatar.tsx` with a `ChiefAvatar` component:
  - Uses `react-native-svg` (`Svg`, `Circle`, `Path`, `G`, `Rect`).
  - Background circle with `fill={brand.colors.iconBackground}` at radius 60.
  - Blob body `<Path>` via `brand.mark.blobBody` with correct transform.
  - Two eye rects rendered via `useAnimatedProps` + `AnimatedRect`.
  - Accepts `life: AvatarLife` (passed from the parent `BotAvatar`).

- [x] 4.2 `MobileBotAvatarPresentation` in `apps/mobile/lib/bot-avatar.ts`:
  - `brand-chief` kind propagated automatically via `Exclude<ParsedBotAvatar, { kind: "shape" }>`.
  - No code change required.

- [x] 4.3 In `apps/mobile/components/bot-avatar.tsx`:
  - Import `ChiefAvatar`.
  - Add `parsed.kind === "brand-chief"` branch that renders `<ChiefAvatar life={life} size={size} bodyStyle={bodyStyle} />`.

## 5. Sign-up flow

- [x] 5.1 In `apps/web/src/pages/Onboarding.tsx`, `createOrReuseFirstBot`:
  - Add `color: "::brand_chief"` to the `rpc.bots.create` input object.

## 6. Guard: unknown-kind fallback

- [x] 6.1 Added test in `packages/ui-web/src/bot-avatar.test.tsx` asserting that
  `parseBotAvatar("::brand_chief")` does not return `isImage: true` or `shapeIndex`, and
  renders the chief avatar classes.

## 7. Validate

- [x] 7.1 `pnpm --filter @rakazo/contracts test` (337 tests), `pnpm check` (root) all pass.
- [ ] 7.2 `openspec validate brand-chief-nurling-avatar --strict` — skipped (tool not in path).

## 8. Pull request

- [ ] 8.1 Open the PR.

## 9. After merge

- [ ] 9.1 Archive this change.
