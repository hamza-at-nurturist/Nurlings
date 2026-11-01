# Design

## Decision: how an extra body is stored

An organic body is normally not stored: every client hashes the bot id (`seed % 10`) to a family.
Bodies beyond the ten cannot be reached by that hash without changing it, which would restyle
every existing bot. So an extra body has to be an explicit, stored choice.

**Chosen:** reuse the existing `#hex::shape_N` value. The brand blob is already `shape_8`; the new
bodies take the next indices, `shape_9`, `shape_10`, `shape_11`. `BOT_AVATAR_SHAPE_COUNT` grows
from 9 to 12 so these indices stop wrapping. `shape_0`..`shape_7` keep parsing and render as the
bot's own id-seeded organic body. The picker only ever writes `shape_8`..`shape_11`.

Why: no new column, no new value format, no API or contract change, and the value already
round-trips through validation, import and every renderer.

**Rejected:**
- Changing the hash to `seed % 14`: restyles existing bots, which the maintainer ruled out.
- A new stored token (for example `::body_N`): needs contract, import and old-client handling
  for no gain over `shape_N`.
- Choosing bodies 10+ through the bot id: the id only carries the hashed family.

**Risk:** an installed mobile build predating this change wraps `shape_9`..`shape_11` through the
old nine-entry table and draws a hexagon for them until it updates. Only bots a person explicitly
sets to a new body are affected; Chief and all existing bots are not.

## Bodies

Frames reuse `OrganicBotAvatarFrame` (path in the 120-unit organic box plus eyes), so the new
bodies get organic motion, glow and eye behaviour for free on web and mobile. The three new
bodies are drawn from our own point lists through the same smoothing as the existing families,
default ellipse-pill eyes. Candidate names: lobe, bean, bloom (final silhouettes judged on the
contact sheet).

## Picker

Web and mobile list: Default, then the brand blob and the three new bodies. The create-bot dialog
keeps its per-look previews (ten hashed families minus the heart) and gains the same four.
