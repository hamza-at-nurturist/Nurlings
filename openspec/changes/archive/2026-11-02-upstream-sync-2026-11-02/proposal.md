# Proposal

## Why

The fork is 66 upstream commits behind `elie222/rakazo` `main` (merge base `14101fca`, upstream
head includes v0.4.0). Syncing again while the gap is small keeps the merge reviewable and the next
one cheap. The merge brings feedback reports, a hardened row-level-security bypass, per-user email
language, the desktop shell in Spanish, localized account emails and the Spanish web catalog fixes,
without losing any Nurlings branding or fork behaviour.

## What Changes

- Merge `upstream/main` into `chore/upstream-sync-2026-11-02` (cut from `main`) with a merge commit
  (no squash, no rebase).
- Keep what is ours: the `NUR` ticket prefix, billing off, the `#hex::shape_N` bot color format,
  "Run actions without asking" default OFF, the bot-panel expand change, the ticket memory tag,
  Nurlings branding, the Coolify deployment files, `AGENTS.md` and the OpenSpec workflow.
- Resolve the 32 conflicted files as listed below.
- Keep the existing brand seam instead of editing upstream strings: upstream now routes desktop,
  mobile and email copy through translation helpers, so the helpers (`t` in the desktop shell,
  `emailText` for emails) rebrand the template before placeholders are filled, as mobile already
  did. Catalog files stay identical to upstream.
- Do not mount upstream's "star us on GitHub" prompt: it links to the upstream repository and the
  built-app brand scan rejects that host. The component and its test stay in the tree, unused, so
  later merges stay clean.

### Conflict list and resolution

| File                                                                          | Resolution                                                                                                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                                                                   | Keep ours. Upstream's changelog, review-bot and Vercel lines and its `## What/## Why` PR format do not apply to this fork.                                           |
| `pnpm-lock.yaml`                                                              | Take upstream's, then `pnpm install --lockfile-only` to add our workspace links (`@nurlings/brand`, `expo-haptics`). The result differs from upstream only by those. |
| `packages/auth/package.json`                                                  | Upstream's `@better-auth/*` 1.7.15 with our `@nurlings/brand` dependency.                                                                                            |
| `apps/desktop/package.json`                                                   | Keep `productName` Nurlings and the Nurturist AI author; take upstream's version 0.4.0.                                                                              |
| `apps/desktop/src/{auto-update,browser-auth,local-stack,main}.ts`             | Upstream's `t(...)` calls; `t` now rebrands. Drop the `brand` imports that became unused.                                                                            |
| `apps/desktop/src/host-screen.ts`                                             | Both sides' imports.                                                                                                                                                 |
| `apps/desktop/src/package-metadata.test.ts`, `apps/desktop/e2e/setup.spec.ts` | Keep our brand assertions and add upstream's new ones. The "Rakazo Cloud" e2e test is dropped: the brand has no hosted service, so setup offers no such choice.      |
| `apps/mobile/lib/i18n.ts`                                                     | Upstream's `translate`, with our `brandText` applied to the template.                                                                                                |
| `packages/adapters/src/pi-runtime-subagent.ts`                                | Both sides' imports.                                                                                                                                                 |
| `packages/auth/src/{email,plugin-submission-email,referral-email}.tsx`        | Upstream's localized copy through `say(...)`, our signature (company name, no GitHub-star link).                                                                     |
| `packages/auth/src/welcome-email.tsx`                                         | Upstream's localized layout; app links come from the brand and are left out when unset. Upstream's Discord, GitHub and self-host promotions are dropped.             |
| `apps/web/e2e/bot-crud.spec.ts`                                               | Upstream's selector with `ui()` around the bot wording.                                                                                                              |
| `apps/web/src/locales/*/messages.po` (13)                                     | Take upstream's, then re-run `intl:extract` so our ticket strings come back.                                                                                         |

### Fixes beyond the conflicts

- `packages/brand` repo check: lines that call `say(` are exempt from the server-text scan, because
  `emailText` rebrands them. `email.test.ts` now renders every account email in English and
  Spanish and fails on any "Rakazo", so the guard is on the output, not the source.
- Desktop `brand-strings.test.ts` accepts a "Rakazo" literal only as the argument of `t(...)`.
- Tests that pinned the product name now use `brand.name`; the reviewed bot-rename snapshot
  includes upstream's new strings; the Spanish welcome test no longer expects upstream's download
  links.
- The Spanish macOS permission prompts upstream added say "Rakazo" and "bots"; they now say
  "Nurlings", and a test covers it.

## Risks

1. **Migrations (5 new, all from upstream).** `feedback_reports` (new table, row-level security),
   `rls_bypass_key` (new private schema and function, rewrites the `*_system` policies, drops the
   `*_previous_release` policies), `rls_bypass_key_required` (marked `-- deferred`, so it applies on
   the deploy after this one), `user_locale` (nullable column) and `billing_byok_price` (nullable
   column and a backfill that matches no rows while billing is off). All keep working with the
   previous release. After the deferred migration the app only gets cross-tenant access with the
   key derived from the runtime login's password. The Coolify runtime login (`rakazo_app`) has a
   password, so it gets a key; `pnpm db:migrate` warns for a login without one.
2. **Environment.** No new required variable. Coolify compose is untouched.
3. **Not a release.** No tag is created or pushed.

Contacts Rakazo-owned infrastructure: no.

## Impact

- Capabilities: `user-facing-branding` (three requirements added: localized emails, the localized
  desktop shell, no promotion of the upstream project).
- About 375 files; almost all of it is upstream code already reviewed upstream.
