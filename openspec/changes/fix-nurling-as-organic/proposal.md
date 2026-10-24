# Proposal

## Why

Chief wears the brand blob (shape 8, `nurling`) but it still lives in the classic shape renderer. In
the sidebar, a working Chief gets the spinning ring and dot that organic avatars dropped, and its
body, glow and hover differ from the organic avatars next to it. #37 gave it organic eye motion;
the rest of the avatar still reads as a different kind of thing. It should behave like an organic
avatar in every state, only with the brand blob as its body and its slanted pill eyes.

## What Changes

Shape 8 is rendered by the same code path as organic avatars, with the brand blob supplied as the
body. Nothing is added to the classic shape renderer; the #37 special case there is removed.

- **Web.** `BotAvatar` hands shape 8 to `OrganicAvatar` with a fixed body path (the brand blob,
  scaled into the organic 120-unit box) and the slanted pill eyes in place of the upright ones.
  It then inherits what organic avatars already do: no working ring or dot, the working body
  animation and glow, the idle and working eye groups with blinks, size handling, hover and
  reduced motion. The `.rakazo-shape-eyes` hook from #37 goes away; its CSS selectors return to
  `.rakazo-organic-avatar` only.
- **Mobile.** `OrganicAvatar` takes the same optional body and eyes, and `BotAvatar` routes shape 8
  through it, so it uses the one shared life clock, working dot and eye worklet exactly as organic
  avatars do. `ShippedShapeAvatar` loses its pill-eye branch.
- **Unchanged.** The saved value stays `#hex::shape_8`, so existing Chiefs keep their avatar and
  colour. The picker still lists the shape, with its static preview. The eight classic shapes render
  exactly as before.
- **Body colour and eyes.** Because it is an organic avatar now, the blob is a flat fill in the
  picked colour with the organic eye colour, instead of the classic gradient. This is the visible
  difference to today and follows from "exactly like organic".
- **One difference kept on purpose.** The blob keeps its silhouette, so its idle body does not
  morph between two organic outlines (there is no second outline); the idle sway, working body
  animation and glow still apply.

## Risks

1. Organic CSS and the studio tell organic bodies from shapes by `.rakazo-organic-avatar`; shape 8
   now carries it. Tests and e2e that assume "shape 8 is not organic" are updated, and the studio
   checks are re-run.
2. Scaling the blob into the organic box could look smaller or larger than organic bodies; sized by
   eye against a teardrop at 36, 42 and 54 px.
3. Mobile cannot be captured in CI; it is covered by the render tests and the screenshot is web only.

## Impact

- Capabilities: `user-facing-branding` (adds a requirement for the brand blob's avatar behaviour).
- Contacts Rakazo-owned infrastructure: no.
- Database: no; the stored avatar value is unchanged.
- Upstream mergeability: the changes are in the avatar components that #37 already touched.
