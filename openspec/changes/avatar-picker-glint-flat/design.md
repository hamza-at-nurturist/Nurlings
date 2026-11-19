# Design

## Storage: a new account column, not `botAvatarSet`

`users.botAvatarFinish TEXT NOT NULL DEFAULT 'glint'`, values `glint` or `flat`.

Reusing `botAvatarSet` was considered and rejected:

- Its values are art sets (`organic`, `rakazo`). Flat is not a set, so it would need a third value
  that older clients map to nothing.
- Saving it restyles every unpinned bot's `avatarSet` and the previous release reads it that way,
  so a new value would repaint bots during a deploy overlap.
- Keeping it alone would mean offering `rakazo` again, which is the hidden logo set.

A separate column leaves `botAvatarSet` untouched, so existing choices render as before and nothing
is migrated. It is additive with a default: the previous release ignores it and draws glint, and
every existing row reads as glint. The API returns it on `me` and takes it on `preferences/update`;
it does not touch bots, so unlike the set it needs no restyle step.

## What each finish draws

One helper in `packages/core` answers "which effects does this finish draw", so web and mobile do
not each decide. Glint draws all of them. Flat draws none:

- organic: catchlights and gloss arc;
- logo avatar: flank shade, hand contact shadows, eye glint, eye sheen (the eye's flat fill
  replaces the gradient).

Web hides layers through a data attribute the stylesheets read, and mobile skips the matching SVG
nodes. States, motion, props, pips and the body outline are unchanged.

## Whose finish draws

The viewer's, for every avatar they see, including bots of other people in a shared space, since the
setting is about what you see.

## Non-goals

No per-bot finish, no new bodies or sets, and no offer of the `rakazo` set.
