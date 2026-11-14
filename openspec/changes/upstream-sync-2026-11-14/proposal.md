# Proposal

## Why

The fork is 569 upstream commits behind `elie222/rakazo` `main` (merge base `e5e89b6a`, the Nov 6
sync; upstream head `f85940d2`, Nov 14). Keeping close keeps future merges cheap and brings
upstream's fixes and features: per-account Labs with the board as one of them, shared Lingui
catalogs for web and mobile, the avatar look picker on mobile, a native macOS stack with signed
releases from forks, model credit caps, bot email policy, vault item access, thread reads and
snooze, background helper threads, message delivery recovery, Expo 58 and vitest 5.

## What Changes

- Merge `upstream/main` into `chore/upstream-sync-2026-11-14` (cut from `main`) with a merge commit.
  No squash, rebase or cherry-pick. `main` stays as it is until this branch is approved.
- Take upstream for everything except what is ours, as in the Nov 6 sync: branding and the brand
  seam, the `NUR` prefix, billing off, `#hex::shape_N` bot colors, "Run actions without asking"
  default OFF, bot-panel expand, avatar art and working states, the asleep preview, the caveman
  skill, Coolify files, `AGENTS.md`, OpenSpec, the fork's CI and release workflows, the board and
  tickets work, the Nest dashboard and dashboards with live JSON data.
- Mini apps are not on `main`; this merge does not bring them back.
- No link to the upstream repository, site, store listings, Discord or its hosted images ships: the
  welcome email, the Welcome page, update links and the Cloud choice stay branded or hidden.
- The release workflow keeps Linux and Windows builds and no update feed. Upstream's macOS jobs
  arrive but are not in the fork's matrix.

### Areas that moved upstream and how the fork follows

| Area              | Upstream change                                                                                                 | Resolution                                                                                                                                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Translations      | One set of Lingui catalogs in `packages/i18n` for web and mobile; mobile dictionaries and `useI18n` removed     | Take upstream's. Fork strings are re-extracted and our existing translations are copied into the new catalogs. Mobile board and avatar strings move to Lingui. Rebranding stays at load time (`brandMessages`). |
| Board gating      | The board is a per-account Lab; `TICKET_BOARD_ENABLED=true` turns it on for everyone                            | Take upstream's labs model. Our date reminders, mention wakes and ticket tools check the owner's labs. Deploys that set `TICKET_BOARD_ENABLED=true` behave as before.                                           |
| Prompts           | Model prompts moved into `*.prompt.ts` files                                                                    | Our brand wording is applied there; the brand guard's server-text list follows.                                                                                                                                 |
| Run wiring        | `createRunRuntime` and `createRunReconciler` in adapters build the handlers and housekeeping for API and worker | Our ticket date reconciler and ticket notifications are added there.                                                                                                                                            |
| Avatar look       | Look picker with identities, `botLookState` helpers in core, shipped shapes                                     | Our 14 offered shapes (brand blob, three original bodies, ten families) replace the shipped shapes; retired static shapes still read as the default look.                                                       |
| Emails            | Welcome email rewritten around three steps with Discord and GitHub links                                        | Only the apps step stays, from brand store links; the signature is the company name; no hosted hero image.                                                                                                      |
| Setup and desktop | Setup IPC split into modules, native macOS stack, signed fork releases                                          | Take upstream's; our brand and hosted-service handling are re-applied.                                                                                                                                          |

### Conflict list and resolution

108 files conflicted (before counting the translation catalogs that moved).

| File                                                                                      | Resolution                                                                                                                        |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`, `README.md`, `CHANGELOG.md`, `NOTICE`                                        | Keep ours; `NOTICE` also gains upstream's third-party credits.                                                                    |
| `.github/workflows/{ci,release-desktop,release-android-apk,desktop-macos-screenshot}.yml` | Keep the fork's jobs and no update feed. Take upstream's step changes; the Android job uses `pnpm exec eas` as upstream now does. |
| `package.json` files, `pnpm-lock.yaml`                                                    | Upstream's versions plus our `@nurlings/brand` and extras; lockfile regenerated.                                                  |
| `apps/web/src/locales/*`, `apps/mobile/lib/locales/*`                                     | Removed upstream. Fork translations are carried into `packages/i18n`.                                                             |
| Prompt, email, team-chat and messaging text                                               | Upstream's code with brand names re-applied.                                                                                      |
| Board code (`ticket-*`, `ticket-changes`, API and worker wiring)                          | Upstream's labs model with our date, mention, approve and file features kept.                                                     |
| Avatar files (web and mobile)                                                             | See the avatar row above.                                                                                                         |
| Desktop `main.ts`, setup tests, install script                                            | Upstream's structure; our brand, hosted-service and image-registry handling re-applied.                                           |

## Risks

1. **Migrations (48 new, all upstream, dated after ours).** Adding tables, columns and indexes, or
   relaxing `NOT NULL`. Four are `-- deferred` drops held back one deploy. None touch ticket tables.
   Verified by applying every migration to an empty Postgres where a database is available.
2. **Environment.** No new required variable. `TICKET_BOARD_ENABLED=true` must stay set on the
   test server to keep the board on for every account.
3. **Not a release.** No tag is created or pushed.

## Impact

- Capabilities: `board-tickets` (added: the board is a per-account Lab, on for everyone when the
  deployment says so). `mobile-board` follows the same account setting through `ticketBoardEnabled`.
- Most of the change is upstream code.
