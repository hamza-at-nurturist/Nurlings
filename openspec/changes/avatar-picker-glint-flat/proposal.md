# Proposal

## Why

Settings has one "Nurling style" control (stored as "Bot style" in the source and rebranded at
display time): a two-way switch between Original and Nurlings. It swaps the whole avatar art and
nothing finer. People who want a quieter avatar, with no shading, no eye shine or no flare, have
no way to get one. This replaces the two-way switch with a few effect switches. Flat is the
result of turning them off.

## What exists today (checked on `main`)

- **The setting.** One account preference, `users.botAvatarSet` (`organic` or `rakazo`), with the
  per-bot copy `bots.avatarSet` and `bots.avatarSetPinned`. Saving the account value restyles every
  unpinned bot. Mobile shows it on Settings, General as a segmented control; web shows it in the
  account settings overlay (`bot-style-select`). The web e2e `bot-style-setting.spec.ts` is skipped
  because it clicks Rakazo, which a Nurlings build hides.
- **Original** (`organic`) draws the fork's flat organic bodies, with eye catchlights and a gloss
  arc only (no body shading).
- **Nurlings** (`rakazo`) draws the logo avatar: a lit body with hands, flank shading, hand contact
  shadows, a white rim light, gradient eyes and a small glint on each eye. Its source label is
  "Rakazo" and the brand pass shows it as Nurlings.
- **Effects that exist in the renderers.**
  - Shadow and shading (Nurlings look): the flank gradient, hand contact shadows and hand shade.
    The crown light and rim light are highlights, not shadow.
  - Glint: the eye glint (`logo-avatar-glint`) on the Nurlings look, and the catchlight and gloss arc
    on the organic bodies.
  - Eye flare: nothing in the code is called flare. The closest is the gradient sheen on each
    Nurlings eye (`logo-eye` gradient). This proposal treats that as eye flare. **Needs maintainer
    confirmation.**

## What Changes

- **Three switches** under the existing section: Shadow, Glint, Eye flare. All on is today's look,
  and is the default. Each applies to every avatar of the account: bot panel, chat, inbox,
  sidebar, calls and notifications art that renders avatars. Flat is all three off.
- **Web and desktop:** shadcn `Switch` rows in the account settings overlay in place of the
  Original/Nurlings buttons. **Mobile:** native switches on Settings, General in place of the
  segmented control. Electron hosts the web UI.
- **One source of truth** in `packages/core`: an `AvatarEffects` shape, its default, a parser
  that tolerates unknown or missing values, and what each renderer reads. `ui-web` and mobile
  avatars take it from the same place and skip the matching layers.
- **Storage:** one additive column, `users.botAvatarEffects` (`TEXT[]`, default the three ids), the
  list of effects that are on. There is no existing free-form account preference to reuse (`labs`
  is for feature flags), so a column is truly needed. It is additive with a default, so the previous
  release keeps working and simply ignores it. Nothing is dropped.
- **People who already chose Original or Nurlings.** The stored `botAvatarSet` and the per-bot
  values stay and keep rendering, so nobody loses their choice or their pinned bots. Nurlings users
  get all effects on, so nothing changes. See the decision in `design.md` for how Original users
  reach the switches.
- **Unchanged:** the 14 shapes, per-bot looks and the bot avatar picker. Per-bot flat or glint is
  out of scope.

### Copy

Existing: the section label "Bot style" (shown branded as Nurling style). New, only three labels:

- `Shadow`, `Glint`, `Eye flare`

Why they are necessary: each switch controls one thing that has no icon people would recognise, so a
word is the only way to say what it does. There is no explainer text, status line or "Original" and
"Nurlings" captions. Revealing them only when relevant would not work: they are the entire control.
Each goes through Lingui with translations for the fork's locales. The old strings
"Original" and "Rakazo" leave the screen.

### Brand

Only the Nurlings brand is shown. No upstream names or links, and nothing contacts Rakazo
infrastructure.

### Tests

- Unit: core effects parser and defaults; ui-web and mobile avatar render with each effect off and
  all off; API preferences save and read, including an unknown value and an old client with no
  field; account settings (web and mobile) switches replace the old buttons and persist.
- Postgres: the column default for an existing row and a save round trip.
- Web e2e: un-skip a rewritten `bot-style-setting` that flips each switch and checks avatars in the
  sidebar and chat. The desktop e2e runs in CI only.
- Visual: the art is visual, so the PR carries a contact sheet of all eight effect combinations
  and the CI e2e screenshot of the settings; native mobile captures only if I have them.

## Impact

- Capability: `user-facing-branding` (ADDED requirements).
- Areas: `packages/contracts` (preferences), `packages/db` (schema, migration), `apps/api`
  (preferences route and `me`), `packages/core`, `packages/ui-web`, `apps/mobile` (avatars and
  General), the web account settings overlay, Lingui catalogs, and the Android notification icon
  only if it draws these effects (to be checked).
- Deploy: additive migration only.
