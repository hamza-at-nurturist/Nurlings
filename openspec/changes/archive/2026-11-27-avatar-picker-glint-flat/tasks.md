# Tasks

## 1. Contract and storage

- [x] 1.1 Contracts: `BotAvatarFinish` (`glint` | `flat`), default, tolerant parser. Core: one helper
  for which effects a finish draws. Verify: unit tests (default, unknown value, missing value).
- [x] 1.2 Add `users.botAvatarFinish` (additive migration) and carry it on `me` and
  `preferences/update`. Verify: Postgres test for the default on an existing row and a save round
  trip; API test for an old client with no field and for an unchanged `botAvatarSet`.

## 2. Drawing

- [x] 2.1 Web: draw flat in `packages/ui-web` for organic bodies, shaped bots and the logo avatar,
  reading the viewer's finish everywhere avatars render. Verify: render tests for glint and flat.
- [x] 2.2 Mobile: the same in `apps/mobile/components/bots`. Verify: mobile render tests.
- [x] 2.3 Check the Android notification icon and other avatar drawings for these effects. Verify:
  note in the PR of each place checked.

## 3. Settings

- [x] 3.1 Web and desktop: the toggle group reads Glint and Flat and saves the finish; rewrite and
  un-skip `bot-style-setting`. Verify: overlay test and e2e.
- [x] 3.2 Mobile: the segmented control reads Glint and Flat and saves the finish. Verify: update
  `account-screen.test.tsx`.
- [x] 3.3 Lingui: extract `Glint` and `Flat`, translate for the fork's locales, drop the unused
  Original and Rakazo strings. Verify: `pnpm intl:extract` leaves the catalogs current.

## 4. Verify

- [x] 4.1 `tsc`, `pnpm exec biome check .` and `pnpm exec vitest run` pass.
- [ ] 4.2 (Done by eye and shared in the session; the CI e2e screenshots stayed in the CI run and were not embedded in the PR body. No native capture.) Contact sheet of glint and flat and the CI e2e screenshot in the PR; say so if no native
  mobile capture exists.
- [x] 4.3 Tell the maintainer when ready; they cut any release tag.
