# Proposal

## Why

The default "Chief" Nurling auto-created at sign-up is a generic organic-blob avatar. Chief is the
face of the product — the first thing every new user sees — so it should carry the brand mark
instead of a random shape. Every other Nurling keeps the existing picker avatars; only Chief is
special.

## What Changes

A new reserved avatar value `"::brand_chief"` is added. When a Nurling's stored `bots.color` is
this value, every client renders the Nurlings mark as the avatar instead of a generic shape. The
sign-up flow sets this value when it creates the default Chief Nurling.

### Avatar design

- **Body.** The Nurlings blob from `packages/brand` (`brand.mark.blob`), using the small viewBox
  (`brand.mark.smallViewBox`: `237 574 1369 898`), **without** the two eye cut-out sub-paths,
  fills the avatar as a white shape on a brand-navy (`#03091F`, `brand.colors.iconBackground`)
  circle — the same pairing as the app icon.
- **Eyes.** The tall pill eyes from `OrganicAvatar` (7 × 24 rect, `rx 3.5` in a 120-unit space,
  matching `packages/ui-web/src/bot-avatar.tsx`) are drawn on top, positioned at the logo eye
  centres (left ≈ (0, −10), right ≈ (10, −8) in the scaled 120-unit space) and tilted ~13.5°
  to match the slant in the mark. Both idle-blink and working animations are identical to every
  other organic-style Nurling; reduced motion is respected.
- **Working state.** A glow filter using the first orb gradient stop (`#4FFFDB`) replaces the
  generic `colorDef.light` glow used on other bots.

### Blob body path derivation

`brand.mark.blob` is a single `fill-rule:evenodd` path string with three sub-paths:
1. the outer blob outline
2. the left eye cut-out
3. the right eye cut-out

The eye cut-outs are removed at runtime by taking the first sub-path only:
`brand.mark.blob.split("Z")[0] + "Z"`. This avoids touching `brand.json` or the brand schema,
keeping the upstream merge diff to zero on that file.

### Eye coordinate derivation

The mark's eye paths are parsed once to get their centres in the small-viewBox coordinate space.
The avatar SVG reuses OrganicAvatar's `viewBox="-60 -60 120 120"` and applies a single
`scale(0.0701) translate(-921.5, -1003)` transform to the blob group, so the blob fills ~80% of
the circle. Eye centres in the resulting 120-unit space are:

| Eye   | Approximate centre |
|-------|--------------------|
| Left  | (−0.1, −9.8)       |
| Right | (9.6, −7.6)        |

### How Chief gets the value

`apps/web/src/pages/Onboarding.tsx` → `createOrReuseFirstBot` → `rpc.bots.create` receives
`color: "::brand_chief"`. No database migration is needed; `bots.color` is already a plain text
column with no constraint on the set of values. Existing Chiefs (created before this change) are
left alone — the maintainer can update them by hand via the avatar picker, which will show the
new reserved option alongside the standard picker shapes.

### Upstream files touched

| File | Change | Merge risk |
|------|--------|------------|
| `packages/contracts/src/bot-avatar.ts` | Add `kind: "brand-chief"` to `ParsedBotAvatar`; recognize `"::brand_chief"` in `parseBotAvatarValue` and `isBotAvatarValue` | Low — new branch; existing branches unchanged |
| `packages/ui-web/src/bot-avatar.tsx` | Handle `kind: "brand-chief"` in `BotAvatar`; import and render `ChiefAvatar` | Low — new case in existing render path |
| `packages/ui-web/src/index.ts` | Export `ChiefAvatar` from the package | Low |
| `apps/mobile/lib/bot-avatar.ts` | Add `{ kind: "brand-chief" }` to `MobileBotAvatarPresentation`; handle in `mobileBotAvatarPresentation` | Low — new case |
| `apps/mobile/components/bot-avatar.tsx` | Add `brand-chief` rendering branch in `BotAvatar` | Low — new case in existing if-chain |
| `apps/web/src/pages/Onboarding.tsx` | Add `color: "::brand_chief"` to the `rpc.bots.create` call | Low — one new field on an existing call |
| `packages/adapters/src/bot-avatar.ts` | Pass `"::brand_chief"` through `isBotAvatarValue` unchanged (already handled; no edit needed after contracts update) | None |

### New files

| File | Content |
|------|---------|
| `packages/ui-web/src/chief-avatar.tsx` | Web `ChiefAvatar` SVG component (blob body + animated eyes + working glow) |
| `packages/ui-web/src/chief-avatar.test.tsx` | Snapshot + working/idle state assertions |
| `apps/mobile/components/chief-avatar.tsx` | React Native / Reanimated version |

## Risks

1. **Avatar picker shows `::brand_chief` as a raw string** if the picker's colour display path does
   not recognise the new kind. Mitigation: add a guard in `parseBotAvatar` (web) and
   `mobileBotAvatarPresentation` (mobile) so unrecognised-kind bots fall back to the organic
   avatar rather than displaying the raw value. Cover with a test.
2. **User changes Chief's avatar**: the new value is an ordinary `bots.color` value. Users can
   replace it through the avatar picker panel like any other avatar. No special lock is needed.
3. **Existing Chiefs are not auto-updated**: the first deployment leaves existing Chief Nurlings
   with their organic blob. The maintainer applies the value manually if desired. A one-off DB
   query (`UPDATE bots SET color = '::brand_chief' WHERE spawn_key = 'onboarding:first'`) is all
   that is required; there is no migration.

## Impact

- Capabilities: `user-facing-branding` (visual change to the default bot avatar on web, desktop,
  and mobile; no API contract change).
- Contacts Rakazo-owned infrastructure: no.
- Database: no migration; `bots.color` is already an unconstrained text column.
- PR will include a screenshot of Chief at idle and working state (web) from the CI E2E run.
