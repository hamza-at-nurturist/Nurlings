# Design

## What exists

- Core already has the whole model: `avatarState`, `avatarWorking`, `avatarBusySince`,
  `avatarSwapStart/To/Advance` with `AVATAR_SWAP_OUT_MS` and `AVATAR_SWAP_IN_MS`, `avatarFollowStrength`,
  `avatarGlossPath`, `avatarPropAnchors` and `svgPathBounds`, and `avatarToolFromPayload` for the
  `tool` on `agent.tool.called`. The shared activity store already exposes `getLive(botId)` with
  `{ tool, composing }`. Mobile owns `mobileLogoAvatarActivity`, an instance of that store.
- Web draws it in `ui-web/organic-avatar.tsx` and `organic-avatar-props.tsx` (DOM SVG, CSS keyframes,
  SMIL). It reads state with `useAvatarState` and `useToolSwap` in `ui-web`.
- Mobile draws organic bodies in `LegacyBotAvatar` / `OrganicAvatar` in
  `apps/mobile/components/bot-avatar.tsx`: `react-native-svg` plus Reanimated shared values, driven by
  the older three-state clip system (`avatarLifeState`, `avatarClock`, `useLife`). It only receives
  `status` and `composing` as props, and shows a green `WorkingDot` and the typing-dot morph.
  `mobileLogoAvatarActivity.getLive` is not read by the organic path.
- Mobile imports `core`, `contracts`, `ui-tokens`, `chat-ui` and `logging`, not `ui-web`.

## Decisions

### 1. Derive state inside `BotAvatar`, as web does

`LegacyBotAvatar` keeps its props (`status`, `composing`, `motion`, `size`) and adds optional
`name`, `ticketStatus`, `asleep` and `progress`, mirroring web's `BotAvatar`. Inside, it reads the
live tool with a `useSyncExternalStore` on `mobileLogoAvatarActivity` only while the run is active
(a resting avatar adds no subscription, same as web). The existing 12+ call sites need no change to
get states; only callers that want an accessible name pass `name`.

### 2. Shared hooks move so mobile does not copy them

`useAvatarState` (done-settle timer, long-run clock) and `useToolSwap` (timers over the core reducer)
are plain React with no DOM. They move from `ui-web` to `@rakazo/chat-ui`, which both apps already
use, and `ui-web` re-exports them. The alternative, rewriting them in `apps/mobile`, would copy
logic and drift. See Decisions for the maintainer.

### 3. Illustration colors move to `ui-tokens`

`avatar-illustration.ts` moves to `@rakazo/ui-tokens` unchanged (header comment kept), and
`ui-web` imports it from there. Mobile imports the same object; no hex is copied. Anything not
in that file uses a semantic token (pips: `warning`, `destructive`, `success`).

### 4. Drawing: one prop component per tool, native animation

The prop artwork (paths, anchors) is drawn with `react-native-svg` elements in
`apps/mobile/components/avatar-props.tsx`. Shape data that is not platform-specific (wave path,
spiral, star path) stays where it is only if core can hold it as plain strings; otherwise it is
redrawn once on mobile. Animation is Reanimated on the UI thread: one shared clock for the
avatar, with props reading derived values (scribble dash offset, magnifier sweep, laptop typing
glow, orbit angle, ripple scale, ring progress). No per-frame React renders.

### 5. Body motion: reuse the clip system for the idle gaze

Mobile already has authored idle and working clips with blinks. They provide the calm gaze (drift,
blink). State adds: working with a tool holds the eyes on the prop (the gaze offset toward the prop
anchor, like web's follow strength 0 for write and search, 0.3 for computer), needs you and blocked
use a damped drift, thinking keeps the typing dots, asleep shuts the eyes and shows the z's.
`avatarClock` keeps deciding still, parked or running, so 24 pt and Reduce Motion behave as today
and also show only the pip.

### 6. Which avatars move

Today `motion` is `static` (default), `lazy`, `live` or `running`. Proposed:

- The pip shows on every avatar that is given a status, whatever its `motion`, because the pip is
  what a still avatar has. The pip also appears on 24 pt and smaller avatars.
- Props, ripples, orbit and glint animation run only where `avatarClock` is `running`: `lazy` rows
  while busy and `running` marks. A `static` avatar with a working run shows the body and the pip
  state it is in, but not the props.
- The green working dot and the typing-dot morph are removed for organic avatars, as web did. The
  logo set keeps them.

### 7. Tool swap is last and independent

Tasks end with the swap. Before it, a tool change swaps the prop at once. The swap task wires
`useToolSwap` phases to the prop's drop and pop (shared values with `withTiming` for 240 and 500 ms)
and the blink and ring burst. If it slips, everything before it ships.

### 8. Accessible names

An avatar with a `name` is `accessibilityRole="image"` with label "{name}, {state}"; without `name`
it stays out of the accessibility tree, as now. State words need strings. Mobile already has
"Working". The others (thinking, needs you, in review, blocked, done, asleep) are new accessible-name-only
strings. Idle has none: an idle avatar is named by the Nurling's name alone.

### 9. Pips and body color

Body = the Nurling's own color. Pip fills come from `useMobileTokens()` `warning`,
`destructive`, `success`; the pip ring uses `background`. Blocked dulls the body toward the
illustration `dull` color as on web.

## Risks

- Reanimated worklets cannot call React hooks or core functions that are not marked `"worklet"`;
  derived values must be computed from plain numbers in the worklet. Core functions used in worklets
  need the directive, as `logoAvatarNeedsAttention` has.
- Many small avatars (inbox) each with SMIL-like loops: only `running` avatars on screen animate,
  using the existing `useAvatarOnScreen`, so idle lists cost nothing.
- Prop artwork anchors computed in core use a 120-unit box; the web scales the storyboard's 140-unit
  space by 0.857. The same scale is used so the props line up.

## Decisions (approved)

1. **Hook home.** `useAvatarState` / `useToolSwap` move into `@rakazo/chat-ui` and are re-exported from
   `ui-web`. Before moving, check they have no DOM or web-only imports; if any do, split those out
   first.
2. **Accessible-name strings.** Six new lowercase state words in all eight mobile catalogs: thinking,
   needs you, in review, blocked, done, asleep. "Working" already exists. There is no string for idle:
   an idle avatar's accessible name is just the Nurling's name. None is visible text.
3. **Static avatars.** The pip shows on any avatar with a status; props and animation run only where
   the motion clock runs. The green working dot and typing-dot morph go away for organic avatars only.
4. **Screenshots.** No iOS catalog flow. Simulator captures are attached if any are taken; otherwise
   the PR says none were captured.
