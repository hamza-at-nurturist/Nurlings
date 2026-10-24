# Proposal

## Why

The default "Chief" Nurling auto-created at sign-up is a generic organic-blob avatar. Chief is the
first thing every new user sees, so it should carry the Nurlings logo, but it should still look and
behave exactly like every other avatar: same colour picker, same animations, same sizes.

## What Changes

The Nurlings logo blob and its two slanted pill eyes become the ninth entry in the shipped avatar
shape system (`nurling`, index 8, appended so stored indices 0-7 keep their meaning). It renders
through the same path as the other shapes on web, desktop and mobile: the colour comes from the
picker, the working state is the same ring and glow, and the eyes blink and look around with the
same animation. It appears in the create-bot picker and the Avatar Studio like any other shape.

The sign-up flow creates Chief with this shape in the default avatar colour.

### Shape data

- `packages/brand/brand.json` gains explicit fields under `mark`: `blobBody` (the outer outline
  without the eye cut-outs), `eyeLeft` / `eyeRight` (eye centres), `eyeAngleDeg` (13.5), `eyeWidth`
  and `eyeLength` (the pill size). The schema validates them.
- `packages/core/src/bot-avatar-shapes.ts` moves the blob outline into the shared shape box (drawn
  13% wider than the other shapes, about 258 units, because it is short and would otherwise look
  smaller; that is the most that fits the shared view box without clipping; centred like the others) and adds a per-shape eye description. Shapes
  without one keep the current ellipse eyes; `nurling` has two pills tilted 13.5 degrees about their
  own centres.
- `BOT_AVATAR_SHAPE_COUNT` in `packages/contracts` becomes 9, so `#hex::shape_8` is accepted and
  parsed like every other shape value. No new avatar value is introduced.

### Rendering

Web (`packages/ui-web/src/bot-avatar.tsx`) and mobile (`apps/mobile/components/bot-avatar.tsx`) draw
the eyes from the shape's eye description: ellipses as today, rounded rectangles with a tilt for the
brand blob. Mobile animates the pills' offset and height with the existing `eyeState` worklet.

### How Chief gets the value

`apps/web/src/pages/Onboarding.tsx` creates the first bot with
`${DEFAULT_BOT_AVATAR_COLOR}::shape_<index of nurling>`. No migration: `bots.color` is an
unconstrained text column. An existing Chief is switched by hand:

```sql
UPDATE bots SET color = '#8B5CF6::shape_8' WHERE spawn_key = 'onboarding:first';
```

## Risks

1. Stored shape indices of 9 or more used to wrap around the old eight shapes; the picker only ever
   wrote 0-7, so no stored value changes meaning.
2. Mobile eye animation for the pills is not covered by CI screenshots; unit tests cover that the
   shape renders the path and two rounded-rectangle eyes.

## Impact

- Capabilities: `user-facing-branding` (one more avatar shape, and the default Chief's look).
- Contacts Rakazo-owned infrastructure: no.
- Database: no migration.
