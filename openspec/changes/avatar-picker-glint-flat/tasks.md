# Tasks

## 1. Contract and storage

- [ ] 1.1 Add `BotAvatarFinishSchema` (`glint` | `flat`), default and a fallback resolver to
  `packages/contracts`, and an optional `avatarFinish` on bot create, update, read and export beside
  `avatarSet`. Verify: contracts unit tests for parse, default, unknown value, and an old export
  with no finish.
- [ ] 1.2 Add the `avatarFinish` column to the Prisma schema with the additive migration, and read
  and write it with the bot. Verify: Postgres test that create and update persist it and a
  pre-existing row reads as glint.

## 2. Drawing

- [ ] 2.1 Web: draw flat (no catchlights, no gloss) in `packages/ui-web`. Verify: render tests for
  flat and glint, including Chief and a white body.
- [ ] 2.2 Mobile: skip catchlights and gloss for flat in `apps/mobile/components/bots/bot-avatar.tsx`.
  Verify: mobile render test.

## 3. Pickers

- [ ] 3.1 Web and desktop: add the glint and flat tiles to the Avatar Studio and the create-bot
  dialog; Reset restores glint. Verify: component test plus an extended Avatar Studio e2e that
  picks flat and reloads.
- [ ] 3.2 Mobile: add the same tiles to the bot look picker and wire bot settings and bot creation.
  Verify: existing mobile picker and bot settings tests extended.
- [ ] 3.3 Lingui: extract the two accessible names and translate them for the fork's locales.
  Verify: `pnpm intl:extract` leaves the catalogs current.

## 4. Verify

- [ ] 4.1 `tsc`, `pnpm exec biome check .` and `pnpm exec vitest run` pass.
- [ ] 4.2 Contact sheet of glint and flat across a few colours (including white and Chief) and the
  CI e2e picker screenshot in the PR description. Verify: images attached; say so if no native
  mobile capture exists.
- [ ] 4.3 Tell the maintainer when it is ready; they cut any release tag.
