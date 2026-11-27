# Proposal

## Why

The fork is about 930 upstream commits behind `elie222/rakazo` `main` (merge base `00a4e8e11`, the
Nov 19 sync; upstream head is `01e7ea040`, Nov 27). Keeping close keeps future merges cheap and
brings upstream's work: organizations and teams (shared apps, skills, plugins, MCP servers, vault
and login sessions, model connections), a public API, MCP server and CLI, signed webhooks, protected
browsers, routine end dates and overlap control, `find_tool`, option cards and memory edits, page
pictures and reader state, more model providers and CLIs, self-hosting installers, and a long list
of security and reliability fixes.

## What Changes

- Merge `upstream/main` into `chore/upstream-sync-2026-11-27` (cut from `main`) with a merge
  commit. No squash, rebase or cherry-pick. `main` stays untouched until the maintainer approves;
  the branch is deployed separately for testing first.
- Take upstream for everything except what is ours: branding and the brand seam, the `NUR` prefix,
  billing off, board and tickets, our avatars including the Glint | Flat setting, Coolify files,
  `AGENTS.md`, OpenSpec, and the fork's CI and release workflows. Mini apps stay removed.
- No link to the upstream repository, site, store listings, Discord or hosted images ships.

### Areas that moved upstream and how the fork follows

| Area                        | Upstream change                                                                                                                   | Resolution                                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organizations and teams     | Org-owned apps, skills, plugins, MCP servers, vault, login sessions, model connections, multiple accounts per app (13 migrations) | Taken as is. All migrations are additive or `-- deferred`; see Risks.                                                                                                                                             |
| Public API, MCP server, CLI | Scripts and agents use bots; signed webhook deliveries                                                                            | Taken as is.                                                                                                                                                                                                      |
| Security                    | Protected browsers in isolated containers, saved sign-ins bound to the site, untrusted-page cookie/RPC rejection                  | Taken as is.                                                                                                                                                                                                      |
| Routines, chat, memory      | End dates, no overlapping runs, owner's computer, `find_tool`, option cards, memory operations                                    | Taken. Our ticket-ref tagging of saved notes is ported onto the new `remember` operations.                                                                                                                        |
| Lifecycle emails            | Welcome, referral, model-connection and agent-import wording moved out of the repository (`EMAIL_COPY_DIR`)                       | Upstream's mechanism kept. With no folder set the fork sends its own English wording (`nurlings-copy.ts`) through the brand; the Discord and GitHub-star steps are dropped. Other languages fall back to English. |
| Desktop                     | Deep links, device-token cipher, protocol registration, window restore                                                            | Taken. Setup screen and `isUpstreamCloudSetup` kept; protocol is registered as `rakazo://` under the product name; update feed stays off.                                                                         |
| Mobile                      | Native Integrations and MCP editing, keyboard fixes, store-review prompt, mention picker moved                                    | Taken. Store links come from the brand and stay empty, so the review prompt never shows; board mention options follow the moved picker.                                                                           |
| Settings                    | Account chat preferences, spaces panel                                                                                            | Taken, with the Glint or Flat setting kept beside them.                                                                                                                                                           |
| First bot                   | Created on the server                                                                                                             | Chief is still created with the brand blob.                                                                                                                                                                       |
| Self-hosting                | Render blueprint, standalone Compose, GPU image, cloud-init, installer Docker auto-install                                        | Taken; images and download URLs point at our registry and repository, default tag `edge`.                                                                                                                         |

### Skipped or neutralised

| Item                                                                   | What we do                                                                                                 |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Marketing site (Black Friday, Product Hunt, footer, homepage, pricing) | `apps/www` stays as on `main`.                                                                             |
| Apple Watch companion                                                  | Not wired into the Expo config (sources stay, inert).                                                      |
| Support and self-hosted supporter prompts, store rating link           | The "Support Rakazo" alert and its links are removed; the rating row shows only with a brand store link.   |
| Self-signed iOS build overrides (`RAKAZO_IOS_BUNDLE_ID` and friends)   | Not taken: `app.config.ts` stays ours, and their tests are dropped.                                        |
| App icon picker (desktop settings, iOS alternate icons)                | Not offered: its art is upstream's mascot. The iOS plugin is not registered and the web picker is removed. |
| Postiz sign-in preset                                                  | Offered only on loopback: its sign-in is registered for upstream's origin.                                 |
| Billing paywall links (`SELF_HOST_URL`)                                | Point at the product site; billing stays off.                                                              |
| macOS signing, update feed, iOS simulator build                        | Release matrix unchanged; the simulator workflow runs only in upstream's repository.                       |
| Weekly QA agent, preview deploys, OTA, Depot                           | Unchanged: guarded or off.                                                                                 |

### Conflict list

About 110 files conflicted, most of them Lingui catalogs, tests and files that moved.

| File group                                                                     | Resolution                                                                              |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `AGENTS.md`, `README.md`, `CHANGELOG.md`, PR template                          | Ours.                                                                                   |
| `.github/workflows/{playwright,publish-playwright-report,release-desktop}.yml` | Ours (storage guard, no update feed).                                                   |
| `package.json` files, `pnpm-lock.yaml`                                         | Upstream's plus our extras; lockfile regenerated, installs frozen.                      |
| `packages/i18n/locales/*`                                                      | Upstream plus fork strings and edits, three-way per message; `intl:extract` is current. |
| Avatar files (core, ui-web, mobile)                                            | Ours for the look.                                                                      |
| e2e and unit tests                                                             | Upstream's with `ui()`, `branded()` and the brand applied.                              |
| Ratchet baselines, bundle budgets                                              | Union of both; budgets stay at ours.                                                    |

## Risks

1. **Organizations (37 new migrations in all, 13 for organizations).** The largest area: org-owned
   vault credentials, agent grants, shared login sessions and org model connections change who can
   read and use a credential. All are additive; three are `-- deferred` drops (push registration
   trigger, organization computer size, speech allowances) that apply on the deploy after next.
   Several carry timestamps earlier than our `user_bot_avatar_finish`; they are independent of it,
   and `migrate deploy` applies pending migrations in name order. Applied to an empty Postgres.
2. **Lifecycle emails** are English only for now; other languages fall back to English.
3. **Environment.** `TICKET_BOARD_ENABLED=true` must stay set on the test server. New environment
   keys are added to the Coolify compose file and its test.
4. **Not a release.** No tag is created or pushed.

## Impact

- Capabilities: `ci-pipeline` (a new upstream-only workflow), `user-facing-branding` (lifecycle
  emails).
- Most of the change is upstream code.
