# Proposal

## Why

The fork is about 575 upstream commits behind `elie222/rakazo` `main` (merge base `f85940d2`, the
Nov 14 sync; upstream head is its v0.13.0, Nov 19). Keeping close keeps future merges cheap and
brings upstream's fixes and features: routines that run alongside chat and fire from webhooks, Git,
chat apps and email; WhatsApp reply files and images; meeting bots with transcripts in chat; an
unattended approval window; sandboxed computer screen frames; an organization activity log; message
retention; scheduled stable updates for self-hosted Compose; model failover and provider limits; and
a long list of security and reliability fixes.

## What Changes

- Merge `upstream/main` into `chore/upstream-sync-2026-11-19` (cut from `main`) with a merge
  commit. No squash, rebase or cherry-pick. `main` stays as it is until the maintainer approves.
- Take upstream for everything except what is ours, as in the Nov 14 sync: branding and the brand
  seam, the `NUR` prefix, billing off, `#hex::shape_N` bot colors, "Run actions without asking"
  default OFF, bot-panel expand, avatar art and working states, the asleep preview, the caveman
  skill, Coolify files, `AGENTS.md`, OpenSpec, the fork's CI and release workflows, the board and
  tickets work, the Nest dashboard and dashboards with live JSON data.
- Mini apps are not on `main`; this merge does not bring them back.
- No link to the upstream repository, site, store listings, Discord or its hosted images ships.
- The release workflow keeps Linux and Windows builds and no update feed.

### Areas that moved upstream and how the fork follows

| Area                    | Upstream change                                                                                                   | Resolution                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source layout           | Adapters, core, contracts, db, api, web and mobile files moved into topic folders; `rpc.ts` and `domain.ts` split | Take upstream's layout. Fork files (`ticket-*`, `nurlings-board`, brand and avatar files) follow their imports; the ticket RPCs, plugin links and tool definitions are ported. |
| Test and CI workflows   | PR checks run on Depot through a shared `test-suites.yml`                                                         | `ci.yml` calls the same suites on GitHub runners for pushes and pull requests; our brand checks run inside them. Upstream-only deploy and OTA jobs stay guarded.            |
| Translations            | New and changed strings in the shared Lingui catalogs                                                             | Upstream catalogs plus the fork's strings and edits; `intl:extract` is current. The 40 fork board strings now have fr, he, hi, ko, pt-BR and tr translations.               |
| Prompts                 | New prompt files (run instructions, approval resume)                                                              | Brand name and agent noun applied; the brand guard's server-text list follows the moves and covers the new prompt files.                                                    |
| Avatars                 | Upstream's mascot body animation in `bot-avatar`                                                                  | Ours kept: the fork's organic and shape avatars and their states. Upstream's mascot-only e2e and unit expectations are not carried.                                          |
| Mobile app              | Components and lib files moved into folders; inbox header rebuilt                                                 | Layout follows upstream; the Board entry, boot watch and brand splash are re-attached.                                                                                     |
| Compose images          | Default tag `latest`, updater sidecar, computer image pull policy                                                | Defaults stay on our registry and `edge`; the updater image points at our registry. The scheduled-update profile stays off by default.                                      |

### Skipped or neutralised

| Item                                     | What we do                                                                                           |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Apple Watch companion                    | Not wired: the plugin and its app extension are removed from `app.json` (sources stay, inert).        |
| GitHub star prompt                       | Component removed; the fork never showed it.                                                          |
| Affiliates and partner links             | Not shown; billing and affiliates stay off in our build.                                              |
| Upstream marketing copy (meeting bots)   | Marketing site pages are not changed beyond what the merge brings; no upstream links ship.            |
| macOS signing and update feed            | Not in the release matrix.                                                                            |
| Weekly QA agent (`exploratory-qa.yml`)   | Arrives as a file; it needs secrets this repository does not set, so it stays off.                    |
| Plugin submit and integration page links | Stay `null`, as in the previous sync.                                                                 |

### Conflict list

About 150 files conflicted, most of them the Lingui catalogs, e2e specs and files that moved.

| File group                                         | Resolution                                                                                      |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `AGENTS.md`, `README.md`, `CHANGELOG.md`           | Ours.                                                                                           |
| `.github/workflows/{ci,publish-playwright-report,release-desktop}.yml` | See the table above; the report workflow keeps the storage guard. |
| `package.json` files, `pnpm-lock.yaml`             | Upstream's versions plus our extras; lockfile regenerated and installs frozen.                  |
| `packages/i18n/locales/*`                          | Upstream plus fork strings (three-way by message).                                              |
| e2e specs                                          | Upstream's tests with the `ui()` helper applied to the strings the brand changes.               |
| Mobile tests                                       | Upstream's imports, `branded()` kept.                                                           |
| Avatar files (core, ui-web, mobile)                | Ours for the look; upstream's surrounding changes merged.                                       |
| Board and ticket code                              | Moved with the files; labs gating, dates, mentions, approve and file features kept.             |

## Risks

1. **Migrations (32 new, all upstream, dated after ours).** Additive, or deferred drops: six
   migrations start with `-- deferred` and apply on the deploy after next (the legacy run retry
   wake, signup settings columns, computer execution columns, push tokens, retired lease columns).
   Applied to an empty Postgres where one is available; CI repeats it.
2. **Push tokens.** Upstream replaces the push token table with push registrations (its drop is
   deferred). Mobile and server follow upstream's.
3. **Environment.** `TICKET_BOARD_ENABLED=true` must stay set on the test server to keep the board
   on for every account. No new required variable.
4. **Compose updater.** The new scheduled-update profile ships off. Turning it on is a deploy
   decision for the maintainer.
5. **Not a release.** No tag is created or pushed.

## Impact

- Capabilities: `ci-pipeline` (the test suites run on GitHub runners for pull requests too).
- Most of the change is upstream code.
