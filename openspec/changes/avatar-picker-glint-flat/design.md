# Design

## Storage: a new account column

`users.botAvatarEffects TEXT[] NOT NULL DEFAULT '{shadow,glint,flare}'`. The list is the effects
that are on, so a new effect later needs no migration and unknown ids are ignored. Options
rejected: packing effects into `botAvatarSet` (older clients and the restyle logic read it as a set
name), a suffix on a bot's colour string (the previous API validator is anchored and rejects it),
and `labs` (feature flags, wrong meaning). The API returns it on `me` and takes it on
`preferences/update`; an old client never sends it and ignores it.

## Decision for the maintainer: Original users and the switches

Today Original and Nurlings are different art, not different effect levels, so "map Original onto
switches" cannot be exact. Options:

The set is already ignored for any bot with a picked shape, so most accounts see no difference
between the two today. **Not decided yet: the maintainer has not confirmed an option.**

1. **Keep the set, hide the choice (recommended).** Stored sets keep rendering. Glint applies to
   both looks (catchlight and gloss on Original, eye glint on Nurlings). Shadow and Eye flare apply
   to the Nurlings look, so they show only when the account is on it. Original users keep their
   look and can turn glint off, but have no way back to Nurlings from this screen.
2. **Retire Original.** Everyone moves to the Nurlings look with all effects on, and Original users
   turn effects off to get close to their plain look. This changes their avatars on upgrade and
   the organic bodies stay only for bots pinned to them.
3. **Keep a set row** beside the three switches. Nothing is lost, but it keeps the control the
   maintainer asked to replace.

I recommend 1. Say which you want before implementation.

## Rendering

Each avatar reads the account's effects through one core helper. Web sets data attributes the
stylesheet uses to hide layers; mobile skips the matching SVG nodes. States, motion, props and
pips are unchanged. Bots from other accounts in shared spaces draw with the viewer's effects, since
the setting is about what you see.
