# Project Context

## What this is

**Nurlings** is a rebranded fork of **Rakazo** (https://github.com/elie222/rakazo, Apache-2.0, by Elie
Steinbock), shipped by **Nurturist AI** ("Powered by Nurturist AI"). It is an open source,
self-hostable AI agent platform: persistent AI teammates ("bots" upstream, **Nurlings** in our
brand) with their own conversations, memory, routines, and a computer they can use (browser,
terminal, files, graphical desktop). It runs on the web, as an Electron desktop app, and as an
Expo mobile app.

- Product name: **Nurlings** — one bot is "a Nurling", many are "Nurlings"
- Company: **Nurturist AI** — https://nurturistai.com
- Product site: https://nurlings.nurturistai.com
- Support / community link: none for now (Rakazo's Discord is removed, no replacement)

## Rakazo, upstream

Rakazo is "AI teammates you actually own": a self-hosted alternative to hosted assistants, where
the user brings their own model credentials and computer provider. Upstream ships the web app,
desktop app, mobile app, a marketing site (`apps/www`), and a Docker/Compose installer with
published images.

## Stack

- TypeScript monorepo (pnpm workspaces + Turborepo), Node 22+
- React 19, Vite, Tailwind CSS; shadcn/ui on Base UI vendored into `packages/ui-web`
- Electron desktop (`apps/desktop`, hosts the web UI) and Expo / React Native mobile (`apps/mobile`)
- Hono + oRPC API (`apps/api`), Graphile Worker (`apps/worker`)
- PostgreSQL + Prisma (`packages/db`), Better Auth (`packages/auth`)
- Pi runtime and provider-neutral adapters (`packages/adapters`); Docker / E2B / Daytona / Boat
  computers
- Lingui i18n on web (12 locales, `.po` catalogs); typed locale maps on mobile
- Astro marketing site (`apps/www`)
- Tests: Vitest, Playwright (web + desktop), Maestro (mobile); lint/format: Biome

## This is a fork that must stay mergeable with upstream

We keep pulling upstream Rakazo updates (`git remote upstream` → `elie222/rakazo`). Every
decision in this repo's branding work is judged by one question: *does it make the next upstream
merge bigger?* Therefore:

1. **White-label the customer-facing UI only** — the web, desktop (Electron) and mobile (Expo)
   apps that clients see. The API/server, emails, prompts, User-Agent, self-update, images/installer/
   CI, `apps/www`, telemetry, README/docs and internal names (`@rakazo/*` package names, `RAKAZO_*`
   env vars, database / Docker names, storage keys, wire headers, code identifiers) stay as
   upstream. Native identifiers (bundle id, Android package, `rakazo://`, Expo slug, desktop
   `appId`) also stay: the API depends on them. Renaming creates conflicts for no user benefit.
2. **Centralise branding.** One brand config (`packages/brand`) holds name, bot terms, tagline,
   URLs, colours, logo paths. Product code reads it instead of hardcoding "Nurlings"; upstream
   text is rebranded at well-defined seams (catalog load, config generation) rather than by editing
   every upstream string.
3. **Prefer additive changes** (new files, new package) over edits to upstream files, and keep each
   unavoidable edit to upstream files small and mechanical.
4. **Never rewrite upstream history**; `main` tracks upstream plus our commits via merges.

## Legal / compliance (Apache-2.0)

- `LICENSE` is upstream's file and stays byte-for-byte untouched.
- A `NOTICE` file states that Nurlings is based on Rakazo by Elie Steinbock, licensed under
  Apache-2.0, with a link to the original repo.
- The Rakazo name and logo are not used in the Nurlings UI branding. Inside the customer-facing UI
  scope, the name remains only in `LICENSE`, `NOTICE`, and internal identifiers.

## Conventions

- Upstream's `AGENTS.md` applies (treat every visible word as UI; migrations must be backward
  compatible; no secrets in commits; tests deterministic and offline). Note: it describes the repo
  as public; ours is private, but we keep the same hygiene.
- Branches: `rebrand/<topic>` for this effort; PRs titled for the change, bodies say why / what /
  how tested.
- Specs live in `openspec/specs/` (updated by archiving changes); in-flight work in
  `openspec/changes/`.
