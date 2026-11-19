# Proposal

## Why

Settings has one "Nurling style" control (stored as "Bot style" in the source and rebranded at
display time): a two-way switch between Original and Nurlings. It has two problems:

- **It does nothing for most bots.** The Nurlings look only draws for a bot with a plain colour
  (`#hex`) or no colour. A bot whose look is a picked shape (`#hex::shape_N`) draws the same body in
  both sets, because the logo branch runs only when no shape is stored (`bot-avatar.tsx` on web,
  `usesLogoAvatar` on mobile). The two buttons look broken to anyone with shaped bots.
- **It offers a look the build otherwise hides.** The bot pickers gate the icon set behind
  `SELECTABLE_BOT_AVATAR_SETS.length > 1`, which is false here. The account control in
  `general.tsx` and `AccountSettingsOverlay.tsx` is not gated, so it still offers the logo set.

This replaces the two labels with the two choices people actually want: Glint, the full look, and
Flat, the same avatars without the effects.

## What exists today (checked on `main`)

- One account preference, `users.botAvatarSet` (`organic` or `rakazo`), with a per-bot copy
  `bots.avatarSet` and `bots.avatarSetPinned`. Saving it restyles every unpinned bot. Mobile shows it
  as a segmented control on Settings, General; web as a toggle group (`bot-style-select`) in the
  account settings overlay. The web e2e `bot-style-setting.spec.ts` is skipped because it clicks
  Rakazo, which a Nurlings build hides.
- **Organic bodies** (Original, and every shaped bot) draw eye catchlights and a gloss arc, with no
  body shading.
- **The logo avatar** (`rakazo`, drawn only for bots with no shape) draws a lit body with hands:
  flank shading, hand contact shadows, a white rim light, gradient eyes (the eye sheen) and a small
  glint on each eye.

## What Changes

- **Two options, same control.** The segmented control on mobile and the toggle group on web keep
  their place and labels' slot, and read `Glint` and `Flat` instead of Original and Nurlings.
  Glint is the default for everyone.
- **Glint is the look as drawn today.** Flat turns the effects off in whichever look an avatar
  uses:
  - Organic bodies: no catchlights and no gloss arc.
  - Logo avatar: no shading and shadows (flank shade, hand contact shadows), no eye glint and no eye
    sheen. The body, hands and eyes still draw, and the rim and crown lights stay since they are
    outline, not effects.
  - The effects are not user-facing switches. They are what the two options turn on or off.
- **Applies to every avatar** (bot panel, chat, inbox, sidebar, calls), shaped or not, so the
  control finally does something for every bot.
- **One setting, one source.** A shared `BotAvatarFinish` (`glint` or `flat`) in `packages/contracts`
  and a helper in `packages/core` that says which effects a finish draws; web and mobile renderers
  both read it.
- **Storage.** A new additive column, `users.botAvatarFinish` (`TEXT NOT NULL DEFAULT 'glint'`). See
  `design.md` for why not `botAvatarSet`.
- **Existing choices.** The stored `botAvatarSet`, per-bot sets and pins keep rendering exactly as
  they do, and the account value stops being offered or changed. Nobody is migrated: everyone starts
  on Glint, which is today's look. A previous-release client ignores the finish and draws glint.
- **Unchanged:** the 14 shapes and the per-bot avatar picker.

### Copy

Existing: the section label "Bot style" (shown branded as Nurling style). New, only two labels:

- `Glint` and `Flat`

Why they are necessary: they name the two options and are the entire control. No explainer text.
Revealing them only when relevant would not work, since the control is the setting. "Original" and
"Rakazo" leave the screen. Both labels go through Lingui with translations for the fork's locales.

### Brand

Only the Nurlings brand is shown. The hidden upstream-logo set is no longer offered anywhere in
settings. No upstream names or links, and nothing contacts Rakazo infrastructure.

### Tests

- Unit: contracts (finish parse, default, unknown value); core (which effects each finish draws);
  web and mobile avatar render in flat for organic bodies, shaped bots and the logo avatar; API
  preferences save and read, including an old client with no field; account settings (web and
  mobile) show Glint and Flat and persist the choice.
- Postgres: the column default for an existing row and a save round trip.
- Web e2e: un-skip a rewritten `bot-style-setting` that picks Flat and checks avatars in the sidebar
  and chat, then reloads. The desktop e2e runs in CI only.
- Visual: the art is visual, so the PR carries a glint and flat contact sheet (organic, shaped, logo
  avatar, a white and an ink body) and the CI e2e screenshot of settings; native mobile captures
  only if I have them.

## Impact

- Capability: `user-facing-branding` (ADDED requirements).
- Areas: `packages/contracts`, `packages/db` (schema, migration), `apps/api` (preferences route and
  `me`), `packages/core`, `packages/ui-web`, `apps/mobile` (avatars and General), the web account
  settings overlay, Lingui catalogs, and the Android notification icon only if it draws these
  effects (to be checked).
- Deploy: additive migration only.
