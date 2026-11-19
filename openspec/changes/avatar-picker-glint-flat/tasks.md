# Tasks

## 1. Contract and storage

- [ ] 1.1 Core: `AvatarEffects` shape, default, tolerant parser, one helper renderers read in
  `packages/core`. Verify: core unit tests (default, unknown ids, missing value).
- [ ] 1.2 Add the `botAvatarEffects` column, additive migration, and carry it on `me` and
  `preferences/update`. Verify: Postgres test for the default on an existing row and a save round
  trip; API test for an old client with no field.

## 2. Drawing

- [ ] 2.1 Web: hide shadow, glint and eye flare layers per effect in `packages/ui-web` (Nurlings
  and organic looks as decided). Verify: render tests per effect and all off.
- [ ] 2.2 Mobile: the same in `apps/mobile/components/bots`. Verify: mobile render tests.
- [ ] 2.3 Check the Android notification icon and other avatar drawings for these effects. Verify:
  note in the PR of each place checked.

## 3. Settings

- [ ] 3.1 Web and desktop: switches replace the Original and Nurlings buttons in the account
  settings overlay; rewrite and un-skip `bot-style-setting`. Verify: overlay test and e2e.
- [ ] 3.2 Mobile: native switches replace the segmented control on Settings, General. Verify:
  update `account-screen.test.tsx`.
- [ ] 3.3 Lingui: extract the three labels and translate for the fork's locales. Verify:
  `pnpm intl:extract` leaves the catalogs current.

## 4. Verify

- [ ] 4.1 `tsc`, `pnpm exec biome check .` and `pnpm exec vitest run` pass.
- [ ] 4.2 Contact sheet of the eight combinations and the CI e2e screenshot in the PR; say so if no
  native mobile capture exists.
- [ ] 4.3 Tell the maintainer when ready; they cut any release tag.
