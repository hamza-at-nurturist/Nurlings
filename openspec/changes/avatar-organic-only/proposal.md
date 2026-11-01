# Proposal

## Why

The avatar picker mixes two kinds of look: organic bodies that move and blink, and eight static
shipped shapes (hexagon, wedge, squircle, ...) that read as a different product. Picking one gives
a bot a flat, off-brand avatar. The picker should offer organic bodies only, with the brand blob
(Chief's body) among them and a few more of our own so the choice still feels wide.

## What Changes

- **Picker.** The web Avatar Studio (`avatar-studio-popover.tsx`) and the mobile bot settings
  (`bot-settings.tsx`) stop listing the eight static shapes. They list the organic bodies: the
  bot's own default body, then the extra bodies below.
- **Existing bots keep working.** `#hex::shape_N` is still parsed and stored values are never
  migrated. A bot with `shape_0`..`shape_7` renders as an organic avatar in its stored colour
  (its own id-seeded body, as `#hex` does); `shape_8` stays the brand blob.
- **More organic bodies.** The brand blob (Chief's shape) plus three new original bodies join the
  picker. They are appended after the current ten organic families, so `seed % 10` and every
  existing bot's body are unchanged. The new bodies are original silhouettes; none recreates
  another product's avatar.
- **New bots.** `bot-avatar-choice` still gives a new bot the least-used body family and colour
  from the ten hashed families. The extra bodies are an explicit pick, not an automatic one.
- **Contact sheet.** The PR shows the new bodies flat and with the eye glint.
- **Unchanged.** Stored value format, the API contract, the database, Chief's default avatar and
  the `rakazo` icon set that is already hidden.

See `design.md` for how an extra body is stored.

## Impact

- Capabilities: `user-facing-branding` (the brand blob requirement changes from "listed with the
  other shapes" to "listed with the organic bodies"; adds the organic-only picker requirement).
- Copy: none added. Picker labels reuse the existing "Shape N" accessible names, renumbered.
- Database: no migration. Mobile builds already installed draw an unknown index through the old
  shape table, so a bot given a new body looks like a hexagon there until the app updates.
- Contacts Rakazo-owned infrastructure: no.
- Upstream mergeability: edits stay in the avatar picker, `bot-avatar-shapes.ts` and the renderers
  the brand-blob work already touched.
