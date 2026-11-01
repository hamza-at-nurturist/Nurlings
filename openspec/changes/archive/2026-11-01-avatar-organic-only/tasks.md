# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves this proposal before any code. Verify: `openspec validate
  avatar-organic-only --strict` passes and the approval is in the session.

## 2. Shapes and parsing

- [x] 2.1 Raise `BOT_AVATAR_SHAPE_COUNT` to 12 and keep `shape_0`..`shape_7` parsing. Verify:
  `packages/contracts/src/bot-avatar.test.ts` covers old and new indices.
- [x] 2.2 Add three original organic frames (Bean, Drift, Sprout, picked from six candidates on a contact sheet) for `shape_9`..`shape_11` in `bot-avatar-shapes.ts`, each storing an unused gloss arc for a later glint;
  `organicBotAvatarFrame` returns a frame for `shape_8` and these. Verify: `bot-avatar-shapes.test.ts`
  pins each path and checks it fits the organic box.
- [x] 2.3 Render `shape_0`..`shape_7` as an organic avatar in the stored colour on web and mobile.
  Verify: `bot-avatar.test.tsx` and `bot-avatar-render.test.tsx`.
- [x] 2.4 Pin `organicAvatarFamily` so existing ids keep their body. Verify: `avatar-shape.test.ts`
  asserts fixed ids map to the same families as before.

## 3. Pickers

- [x] 3.1 Web: Avatar Studio and the create-bot dialog list organic bodies only. Verify:
  `avatar-studio-popover.test.tsx`, `create-bot-dialog.test.tsx`.
- [x] 3.2 Mobile: `bot-settings.tsx` lists Default plus the four bodies. Verify: `pnpm --filter
  @rakazo/mobile check` and its tests.
- [x] 3.3 New bots still get the least-used hashed look and colour. Verify: `bot-avatar-choice.test.ts`.

## 4. Review artefacts

- [x] 4.1 Contact sheet of the new bodies, flat and with the eye glint. Verify: image attached to
  the PR; no other product's avatar is reproduced.

## 5. Pull request

- [x] 5.1 Open the PR on `feature/avatar-organic-only`; stay with it until CI is green. Verify:
  checks green on the head commit.

## 6. After merge

- [x] 6.1 Archive the change. Verify: `openspec validate --strict`.
