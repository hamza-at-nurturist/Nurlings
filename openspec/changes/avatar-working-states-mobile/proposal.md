# Proposal

## Why

Web avatars now show eight states and what a working Nurling is doing. On mobile, the same Nurling
is still a plain body that moves while busy and carries a green dot. A Nurling that needs you,
is blocked or has just finished looks the same as an idle one, and a busy one never says whether it
is writing, searching or using its computer. The phone is where people most often check on their
Nurlings, so it should say the same thing the web does, with the same shared state and tool values.

## What Changes

- **Organic avatars on mobile show the eight states.** Pips (needs you, in review, blocked, done),
  the glint, the working variants (orbit dot, ripples, progress ring, long-run look) and sleep drawn
  with `react-native-svg` and Reanimated. State, working look and tool come from the existing
  `@rakazo/core` functions and from the `tool` the worker already stamps on tool-called events; mobile
  adds no mapping of its own.
- **Three tool props.** Pencil on a notepad (write), magnifier (search), laptop with its screen
  facing the Nurling (computer). Anchors come from `avatarPropAnchors`; the eyes settle on the prop.
- **Tool swap, as its own last task.** Old prop drops in 240 ms, blink, new prop pops in over 500 ms
  with a ring burst, driven by the shared `avatarSwap*` reducer. The rest ships without it if needed.
- **Calm idle gaze.** Touch has no cursor, so no pointer follow and no dizzy shake. Eyes keep the
  existing idle clips and blink.
- **Still and reduced motion.** Avatars of 24 pt and smaller, and any avatar under Reduce Motion,
  show no props and no animation, only the pip.
- **Shared illustration colors.** The prop colors move from `ui-web` to `@rakazo/ui-tokens` as one
  constants file that web re-exports, so mobile reuses them and no hex is copied. The body keeps the
  Nurling's own color; pips use only the warning, destructive and success tokens.
- **Accessible names include the state** ("Chief, working"); idle keeps just the Nurling's name. Six accessible-name-only strings are added, no visible copy.
- **Shared hooks.** The React state hooks that turn run status into state, long-run clock and swap
  phase move out of `ui-web` into a package mobile can import, so web and mobile run the same code.
  Only drawing and animation stay platform-specific (see `design.md`).
- **Replaces** the green working dot and the typing-dot morph on organic avatars. The "rakazo" logo
  set and photo avatars are untouched.

## Out of scope

- No new bodies, no new avatar for any other product, no change to `seed % 10` or stored values.
- **Not fed yet, left unfed (same as web):** in review (needs a ticket status on the surface),
  asleep (no computer-asleep signal) and the progress ring (no run progress). They are drawn and
  unit tested; nothing on mobile supplies them, and the PR says so.
- Pointer follow and dizzy are web-only.
- No backend, contract or migration change; the optional `tool` field already exists.

## Impact

`apps/mobile/components/bot-avatar.tsx` (organic path) and new avatar files beside it,
`apps/mobile/lib` (state hook wiring, state names), `packages/ui-tokens` (illustration colors),
`packages/ui-web` (re-export, hooks move), one new shared hooks home (see `design.md`), mobile locale
catalogs (six accessible-name strings). No new dependency, no migration.
