# Proposal

## Why

An organic avatar today says one thing: busy or not (a glow and a slow morph). A Nurling that
needs you, waits for review, is stuck or just finished looks the same as an idle one, and a busy
one never says what it is doing. The approved storyboard gives each state a distinct, calm look
and shows what the Nurling is working with (a notepad, a magnifier, a laptop). This change builds
that for the organic bodies, with the state and the tool decided once in shared code and by the
backend, so web and mobile only render what they are given.

## What Changes

- **Shared state model** (`packages/core/src/avatar-life.ts`). One pure function maps what the
  product already knows (run status, composing, ticket status, an optional asleep flag) to one of
  eight avatar states: idle, thinking, working, needs you, in review, blocked, done, asleep. No new
  status values. Working carries a look (orbit dot, progress ring, ripples, long run) and a tool
  (`write | search | computer | none`). Plain data only.
- **Backend tool mapping.** The worker stamps a `tool` category on the existing
  `agent.tool.called` event, from one provider-neutral map in `@rakazo/core`. The web and mobile
  activity projections carry it through. Unknown tools and no tool mean `none`. This stays in this
  change: it is one map, one extra payload field and a few lines in the projection (see `design.md`).
- **Web renderer** (`packages/ui-web`). The storyboard's states, pips, glint, three props, working
  variants, tool swap, cursor follow and dizzy shake, drawn in SVG and CSS. One shared pointer
  controller (not a listener per avatar). Avatars of 24px and smaller, and Reduce Motion, stay
  still and show only the pip.
- **Mobile: split out.** This PR is the model, the backend map and web. Mobile ships next as
  `feature/avatar-working-states-mobile` on the same model, with a calm idle gaze instead of cursor
  follow and dizzy, because touch has no cursor. Reasoning is in `design.md`.
- **Illustration colors.** Prop artwork colors (yellow pencil, laptop grays, notepad paper, lens
  glass) live in one constants file marked as deliberate illustration colors. The body uses the bot's
  color; pips use the warning, destructive and success tokens.
- **Accessible names, no new copy.** Avatars get a name that includes the state, for example
  "Chief, working". No visible text is added. The existing state words are reused where a locale
  entry exists; any new accessible-name string is quoted in the PR.

## Out of scope

- Existing bodies, `seed % 10` and the stored `#hex::shape_N` format are untouched.
- The "rakazo" logo avatar set and its `LogoAvatarActivity` pipeline are untouched.
- A signal for "computer asleep" does not exist in the product today. The model accepts it, but
  nothing feeds it in this change.
- A real progress fraction does not exist for runs today. The ring is built and tested but nothing
  feeds it yet.

## Impact

`packages/core` (state model, tool map, events payload), `packages/contracts` (optional `tool`
on the tool-called payload), `packages/adapters` (stamp the field), `packages/ui-web` (renderer,
pointer controller), `apps/web` (activity projection feeds the state). No migration, no new
dependency, no new vendor code.
