# Proposal

## Why

Mini apps only help if a bot can write a good one. A four-screen dashboard in the flat format is
about 270 elements, each listed by id with a children list of ids. A model writing that by hand will
drop a child, mistype a key or use a prop that does not exist, and the person sees a screen that says
it cannot be shown. The bot never learns, because nothing checks the file before it is attached, and
it has no screen to copy from.

## What Changes

- **A nested format.** A spec can write `root` as an element whose `children` are elements, with no
  ids. The app flattens it when the file opens. The flat format keeps working.
- **A check where a bot saves.** `attach_file` refuses a mini app file the app could not draw and
  returns the reason in words (for example which element and which prop). `write_file` still writes
  but returns the same reason, so the bot fixes the file before it attaches.
- **A shared package.** The catalog, icon list, nested-to-flat step and file check move out of the web
  app into `@rakazo/mini-app`, so the web app and the server run the same validator.
- **A starter.** An "App templates" skill holds a multi-screen app (sidebar, tiles, chart, tabbed
  table) to copy and adapt. It loads only when a bot asks for it. The Apps skill teaches the nested
  format and the props it had wrong.

Not in this change: buttons that run actions through the bot, and the colors of overlays.

## Impact

- Capability: `mini-apps`.
- New package `@rakazo/mini-app`; the web app and `@rakazo/adapters` depend on it.
- No new dependency beyond the workspace package; no migration; no new user-facing copy.
