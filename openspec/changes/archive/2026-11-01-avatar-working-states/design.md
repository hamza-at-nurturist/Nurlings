# Design

## What exists

- `avatar-life.ts` already has `AvatarLifeState = idle | working | thinking`, used by mobile's
  pose and clip system (`avatarClock`, `avatarClipPool`). It stays as is.
- `logo-avatar-activity.ts` already projects the public event stream (`agent.tool.called`,
  `thread.progress`, run lifecycle) into a per-bot activity, with exact built-in tool names, shared
  by web and mobile through `createLogoAvatarActivityStore`. It only feeds the "rakazo" logo set.
- The organic avatar in `ui-web/bot-avatar.tsx` gets only `isWorking` from run status.
- Run statuses: `queued | leased | running | waiting_input | waiting_takeover | completed | failed |
  cancelled`. Ticket statuses: `todo | doing | review | blocked | done | closed`.

## Decisions

### 1. A new `AvatarState`, projected onto the old one

Add `AvatarState` (the eight storyboard states) and `avatarState(input)` beside the old type. A
small `avatarMotionState(state)` maps it to the old `AvatarLifeState` so mobile's clip code keeps
working untouched. Widening the old type instead would change every `switch` on it.

Mapping, in one place (first match wins):

| Input                                                               | State                                  |
| ------------------------------------------------------------------- | -------------------------------------- |
| computer asleep flag                                                | asleep                                 |
| run `waiting_input` or `waiting_takeover`                           | needs you                              |
| run `failed`, or ticket `blocked`                                   | blocked                                |
| ticket `review`                                                     | in review                              |
| run `queued`, `leased`, `running`, composing                        | thinking while composing, else working |
| run `completed` within the settle window, or ticket `done`/`closed` | done                                   |
| anything else                                                       | idle                                   |

Done after a run is shown for `AVATAR_DONE_MS` (4 seconds) and then idle, so a finished Nurling
does not keep a green tick forever. A ticket that is `done` keeps it while the ticket view shows
that ticket. Background (ticket) runs keep today's rule: they do not drive a chat avatar.

### 2. Working look and the long-run threshold

`avatarWorking({ tool, progress, status, workingMs })` returns `{ look, tool, long }`:

- `look`: `tool` when the tool is not `none`; else `ring` when `progress` is a number from 0 to 1;
  else `orbit` for a running run; else `ripple` for `queued`/`leased`, where nothing has started and
  no progress can exist. The orbit dot stays the default.
- `long`: true after 3 minutes of continuous work (`AVATAR_LONG_RUN_MS = 180_000`). Continuous means
  the state stays working or thinking (a run flips between them every time it writes text, so
  counting working alone would never reach 3 minutes); the clock restarts when the Nurling leaves
  both (waiting for you, done, idle). A tool swap does not reset it.

3 minutes is a judgement call: long enough that ordinary tool bursts never trigger it, short
enough that a stuck-feeling run gets a tired look before the user wonders. It is one constant.

### 3. Tool swap is a small state machine

`avatarToolSwap(prev, next)` is a pure reducer over `{ shown, phase }` with phases `rest | out |
in`. A new tool while at rest goes to `out` (240 ms, old prop drops, eyes blink), then `in`
(500 ms, new prop pops with a ring burst), then `rest`. A tool change during a swap replaces the
pending target instead of queueing. Durations are exported constants copied from the storyboard.
Swaps to or from `none` use the same path (the orbit dot is the `none` prop).

### 4. The backend owns the tool category

The worker already appends `agent.tool.called` with `{ name, executionId }` in `run-turn.ts`. It will
add `tool: "write" | "search" | "computer"` when the tool is mapped, and omit it otherwise.

One map, `AVATAR_TOOL_CATEGORY`, in `@rakazo/core`, exact built-in tool names only:

- write: `write_file`, `scratchpad_*`, `remember`, `save_memory`, `save_shared_memory`,
  `skill_create`, `skill_update`, `ticket_comment`
- search: `search_history`, `read_history`, `recall_memory`, `read_file`, `list_files`, `skill_read`,
  `web_fetch`, `ticket_get`
- computer: `computer_*`, `browser_*`, `user_computer_*`, `shell`, `open_path`, `launch_app`
- anything else (including MCP and integration tools, whose names are not ours): none

The final list is checked against the registered tool names in a test, so a renamed tool fails CI
instead of silently becoming `none`.

Why stamp the event rather than let each client run the map: the product rule says the backend owns
the decision and the frontend renders the value. The existing client projection uses a name list in
core; this change makes the worker the one caller, and clients read `payload.tool`. Old events
without it read as `none`, so replay and mixed-version clients are safe. The payload is an untyped record
in the contract, so no schema change is needed. No vendor logic, no new env var.

The "rakazo" logo set keeps its own `READING/WRITING/COMPUTER` sets for now. They overlap in intent;
merging them is a follow-up so that set's behaviour does not change here.

### 5. Web: one pointer controller, no per-move rerender

`createAvatarPointer()` is a module-level singleton in `ui-web`, with one `pointermove` and one
`pointerdown` listener added when the first avatar registers and removed when the last unregisters.
Each avatar registers its SVG `eyes` and `body` groups and its follow strength. A single
`requestAnimationFrame` per frame reads the pointer and each registered avatar's rect and writes two
CSS custom properties (`--gx`, `--gy`) per avatar; the stylesheet turns those into the transform.
React state never changes on pointer move. Eyes move up to 9 units, the body a third of that
(storyboard `EYE_REACH` 9, `BODY_REACH` 3.2), scaled by `min(1, distance / 180)` and the per-state
strength: idle, working, review, done 1; needs you 0.5; blocked 0.4; laptop 0.3; thinking, asleep,
writing and searching 0.

Dizzy: the detector is a pure class (`createShakeDetector`) fed `(x, y, now)`, ported from the
storyboard (10-unit step threshold per axis, turn when direction flips, 6 turns inside 900 ms).
When it fires, the controller sets one `data-dizzy` attribute on a shared root for 2.4 s, and CSS
shows spiral eyes and orbiting stars on every avatar except asleep and thinking. Stars use SMIL
`animateMotion` in the storyboard; they stay SMIL on web only.

### 6. Still, small and reduced motion

An avatar of 24px or less renders no props, no follow, no animation: only body, flat eyes and the
pip. The same applies under `prefers-reduced-motion`, which the controller also reads once and
re-reads on change. This reuses `AVATAR_STILL_MAX_SIZE`.

### 7. Colors

The body is the bot's color. Pips use `status-warning`, `status-destructive` and `status-success`
tokens (check at implementation that all three exist; if one does not, add it to `ui-tokens` rather
than hardcoding). Prop colors live in `ui-web/src/avatar-illustration.ts` with a header comment
saying they are fixed illustration colors, not product UI colors, so the no-hardcoded-hex rule
does not apply: a yellow pencil must stay yellow in every theme, and the bot's color or a theme token would
make it unreadable or off-brand. White glints use the same file.

### 8. Mobile: split

Mobile needs a Reanimated port of every keyframe (states, props, swap, long run), its own tests and
simulator checks, and sits on top of the same model. Together with web that is too large to review
well. So: this PR is model + backend map + web, and mobile is `feature/avatar-working-states-mobile`
straight after. Mobile degrades by design: no cursor, so no follow and no dizzy; the eyes keep the
calm idle drift. Swap, pips, glint and props apply. It uses plain StyleSheet with `lib/appearance`
tokens, no new dependency.

Until mobile ships, mobile keeps its current rendering; the event field is optional, so it is not
affected.

## Risks

- A tool renamed without updating the map loses its prop. Covered by the registry test.
- The storyboard uses a 140-unit view box and a drop body; our bodies live in a 120-unit box with
  different eye positions per body. Props and eye follow offsets take per-body anchors computed
  from the stored frame (eye center, body bounds). Chief's and the other three bodies get anchors; the
  seeded bodies use their computed bounds. Visual check in the screenshot.
- Gloss arcs for the new bodies exist; Chief's and the seeded bodies need one. The storyboard has
  Chief's. Seeded bodies derive it from the same inner-contour routine used for the new bodies.

## As built

- State names for accessible names come from a `BotAvatarStateNamesProvider`; the web app supplies
  translated ones, so avatars in `ui-web` add no copy of their own. An avatar with a `name` is an
  image named "{name}, {state}"; without one it stays decorative, because the name is usually beside it.
- `BotAvatar` accepts `ticketStatus`, `asleep` and `progress`. No web surface supplies them yet (no
  signal for asleep or progress exists, and the board cards keep their column as the status), so
  in review, asleep and the ring are drawn and tested but only run status, composing and the tool
  reach real avatars today.
- The glint (catchlight and gloss arc) is on for every organic avatar. Bodies without a stored gloss
  (the seeded ones) get an arc derived from their bounds.
- The old working morph and glow on the organic body is replaced by the storyboard's working look.
  Idle avatars now breathe, blink and drift as in the storyboard instead of holding still.
