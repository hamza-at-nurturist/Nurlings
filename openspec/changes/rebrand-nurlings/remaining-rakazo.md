# Remaining "Rakazo" occurrences, and why

Produced for task 10.4 from `git grep -nIi rakazo` (8,711 hits in 1,590 files after the rebrand,
classified with `inventory.py`). Nothing in the customer-facing apps, the server text clients read,
the app identity or the links they follow still names Rakazo, except for the rows below, each with
its reason. `pnpm brand:check` and the vitest guards fail if the in-scope ones come back.

## Still shown to a person, deliberately out of scope

| Where | What a person sees | Reason |
|---|---|---|
| The upstream wording of the automated-message label and the compaction prefix (`LEGACY_AUTOMATED_MESSAGE_LABEL`, `LEGACY_COMPACTED_SUMMARY_PREFIX`) | Not shown: only recognised if imported data carries it | Kept so the matchers accept old data; the labels models see now name the brand. |
| `User-Agent: Rakazo/0.1 (+https://github.com/elie222/rakazo; web tools)` in the web tools | Visible only to the sites a bot fetches | Excluded: bot User-Agent. |
| `README.md`, `docs/*`, `SETUP_PROMPT.md`, `CONTRIBUTING.md`, `SECURITY.md`, `VISION.md`, `CHANGELOG.md`, `.github/ISSUE_TEMPLATE/*`, `infra/railway`, `infra/systemd` | Operator and contributor documents | Decided: left as-is. `docs/nurlings-deployment.md` is the Nurlings guide. `SETUP_PROMPT.md` still points at the upstream installer, so do not hand it to a client. |
| `apps/www` (marketing site) | The upstream marketing pages | Out of scope. |
| `rakazo://` deep-link scheme (mobile and desktop OAuth hand-offs) | A scheme in a redirect URL | Kept: changing it breaks existing links and store association, and nothing displays it. |

## Source that says Rakazo but is rewritten before anyone sees it

| Where | How it is handled |
|---|---|
| `apps/web/src/locales/*/messages.po`, `apps/web/scripts/translations-*.json`, `<Trans>`/`t` messages in `Auth.tsx`, `McpOAuthCallback.tsx`, `HonchoSettingsForm.tsx`, `compatible-model-fields.tsx`, `connection-controls.tsx`, `packages/contracts/src/openai-compatible-ui.ts` | The catalog seam in `apps/web/src/lib/i18n.ts` rewrites the name and the bot terms when a catalog loads; `i18n-brand.test.ts` compiles all 12 locales and fails on any leftover. Source stays upstream-identical so merges stay clean. |
| `apps/mobile/lib/locales/*.ts`, `t("…Rakazo…")` calls in `sign-in.tsx`, `endpoint.ts`, `(settings)/models.tsx`, `(settings)/ai-data-sharing.tsx` | Same, in `apps/mobile/lib/i18n.ts`; `i18n-brand.test.ts` covers every map. |
| `apps/desktop/src/setup.html`, `setup.js` | Branded while `scripts/copy-static.mjs` copies them to `dist`; `brand-setup.test.ts` and the built-output check cover it. |
| `apps/web/index.html`, `apps/web/public/site.webmanifest`, `apps/mobile/app.json` display fields | Rewritten by the Vite plugin, the Expo config overlay and the guard (`brand:check`, `--built`). |

## Internal identifiers kept on purpose

`@rakazo/*` package names, `RAKAZO_*` environment variables, `rakazo-prod` Compose project name,
database, Docker and code identifiers, storage keys such as `rakazo.composerDraft…`, the desktop
`appId` (`dev.rakazo.desktop`), `executableName`, the Expo `slug`, `throw new Error("…Rakazo…")`
messages that no screen shows, `OFFICIAL_REPO_URL` and `PUBLISHED_IMAGE_REPO` (repository identity
checks), `RAKAZO_CLOUD_URL` in `apps/desktop/src/setup-config.ts` (used only to discard a profile saved
against the upstream's hosted service). The Android Kotlin module `com.rakazo.notifications` is an
internal native module, not the app package.

## Kept for legal or merge reasons

`LICENSE` (byte-identical to upstream's), `NOTICE` (credits Rakazo), this change's own tests and
documents (`packages/brand/**`, `openspec/**`), and tests that pin upstream behaviour
(`self-update.test.ts`, `compose-update.test.ts`, `infra/updater/src/index.test.ts`,
`apps/desktop/src/release-workflow.test.ts`, upstream-host assertions in the brand tests).

## CI and release files still naming the upstream

- `.github/workflows/release-desktop.yml` and its test still publish to the `elie222/rakazo` feed and
  expect `Rakazo.app`; `desktop-macos-screenshot.yml` expects `Rakazo.app`. The desktop updater is
  off and the feed is removed from the packaged app, but these workflows need updating before a
  desktop release is cut from this repository.
- `.github/workflows/publish-server-image.yml` (upstream's) names `elie222/rakazo` in its guard
  condition; it never runs here.

## Other things that cannot be seen from the code alone

- Placeholder artwork (a plain "N" tile) stands in for real brand assets until replaced.
- Push notifications stay inactive until an Expo project exists (`app.json` placeholders).
- Provider consoles (Apple, Google, Expo, GitHub) need the manual steps in the pull request.
