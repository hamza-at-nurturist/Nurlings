# Design

## Where the finish is stored

**Decision:** a new `avatarFinish` column on bots (`TEXT NOT NULL DEFAULT 'glint'`), not a
suffix on the colour string.

Options considered:

1. **Suffix on `bots.color`** (for example `#hex::shape_3::flat`). No schema change, but the
   value check is anchored (`^#hex::shape_\d+$`), so the previous release's API rejects it during
   the deploy overlap, and older mobile builds parse `3::flat` as shape 0 or the whole value as
   unknown. Rejected.
2. **A new shape-index range** for flat bodies. Older builds read the index modulo 22 and would
   draw a different body. Rejected.
3. **Column.** Old code ignores it and draws glint, which is a safe degrade. Adding a column with a
   default is allowed in a same-release migration. Same shape as `avatarSet`. Chosen.

The finish is independent of the body and colour, so changing the shape or colour keeps it, and
Default and Reset in the picker restore the body only. "Reset" on the web studio also resets the
finish to glint.

## Where it draws

One boolean decision at the renderer: web sets `data-glint` from the finish, and the existing
`data-glint="false"` rule is extended to hide the catchlights too; mobile skips the catchlight
circles and the gloss path. States, props, pips and motion are unchanged. Chief's ink tone and the
light-body tone only matter for glint.

## Non-goals

No new bodies, no new sets, no tabs, and no change to the 14 shapes or the hidden `rakazo` set.
