# Proposal

## Why

Every Nurling avatar draws the same finish: eye catchlights and a gloss arc on the body. That
glint is always on and cannot be turned off. Some people want a quieter, plain avatar, and the
picker gives them no way to get one. This adds a second finish, flat, next to the one every bot has
today, which we call glint.

What exists today (checked on `main`):

- Two avatar sets: `organic` (the Nurlings bodies) and `rakazo` (draws upstream's logo). The
  fork offers only `organic`; `SELECTABLE_BOT_AVATAR_SETS` is `["organic"]`, so the icon-set tabs
  stay hidden. Stored `rakazo` values still render.
- 14 pickable bodies plus Default (Chief, three originals, ten families), stored as
  `#hex::shape_N` on `bots.color`.
- No glint or flat avatar, set or look exists. Glint is only the catchlight and gloss every organic
  body draws (`data-glint="true"` on web, `glintColors` on mobile). The web stylesheet already has
  a `data-glint="false"` rule that hides the gloss, but nothing sets it.

## What Changes

- **Finish choice.** Each bot has a finish: glint (today's look, the default) or flat (no
  catchlights and no gloss; body and eyes only). It applies to every organic body, the brand blob
  and the families, in any colour.
- **Web and desktop picker.** The Avatar Studio and the create-bot dialog get a second row under
  the shapes with two preview tiles, glint and flat, drawn in the current shape and colour. The
  chosen tile is marked like the chosen shape. Electron hosts the same UI.
- **Mobile picker.** The same two tiles under the shape grid in the bot look picker, plain
  StyleSheet like the other avatar tiles. Bot settings and bot creation both use it.
- **Not tabs.** Glint and flat are not icon sets, so the set tabs stay gated behind
  `SELECTABLE_BOT_AVATAR_SETS.length > 1`, and the 14 bodies stay as the fork shipped them.
- **Storage.** A new `avatarFinish` column on bots, default `glint`, carried through the same
  bot create, update, read and export paths as `avatarSet`. See `design.md` for why not the colour
  string.
- **Migration and compatibility.** One additive migration: `ADD COLUMN "avatarFinish" TEXT NOT NULL
  DEFAULT 'glint'`. No backfill and nothing dropped, so the previous release's code keeps working
  during a deploy. Existing bots keep glint, so no avatar changes on upgrade. A previous-release
  client reading a flat bot just draws glint.
- **New bots** start glint. The create-bot preview shows the chosen finish.
- **Rakazo set.** Unchanged and still hidden. Its logo avatars ignore the finish.

### Copy

No visible copy. The two tiles are previews like the shape tiles, with accessible names only:

- `Glint` and `Flat`

Why it is necessary: screen readers need to name two controls whose meaning is only visual. Visible
labels would repeat what the preview already shows, and the shape tiles already work this way
(accessible name `Shape 3`, no text). Both names go through Lingui and get translations for the
locales the fork ships.

### Brand and internal naming

Only the Nurlings brand appears. "Glint" and "Flat" are plain words, no upstream names or links,
and nothing contacts Rakazo-owned infrastructure. The `avatarSet` precedent keeps the contracts
diff small for upstream merges.

### Tests and how the art is checked

- Unit: contracts (finish parse, default and fallback for unknown values), core look helpers
  (finish selection, shape and colour changes keep the finish), ui-web render (flat has no
  catchlights or gloss, glint unchanged, Chief and white bodies in both), mobile render and picker.
- Postgres: create and update persist the finish, and a bot created before the migration reads as
  glint.
- Web e2e: extend the Avatar Studio spec to open the picker, choose flat, see the avatar change and
  survive a reload; same choice in the create-bot dialog. Mobile uses the existing bot settings and
  look picker tests. The desktop e2e is not run locally (CI only).
- Visual: the art is visual, so the PR carries a contact sheet of glint and flat across a few
  colours (including white and Chief) and the CI e2e screenshot of the picker. Native-only mobile
  captures are attached only if I have them; otherwise the PR says so.

## Impact

- Capability: `user-facing-branding` (ADDED requirements, no existing text changed).
- Code areas: `packages/contracts` (bot schemas), `packages/db` (Prisma schema, migration, bot
  reads and writes), `packages/core` (look helpers), `packages/ui-web` and
  `apps/mobile/components/bots` (avatar drawing), the web picker and create-bot dialog, the mobile
  look picker and bot settings, Lingui catalogs.
- Deploy: additive migration only, safe beside the previous release.
