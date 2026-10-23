## Why

The Nest dashboard (`/app/nest`) is not wanted. Removing it keeps the product smaller and shrinks our diff against upstream.

## What Changes

- Remove the `/app/nest` page, route and sidebar entry.
- Remove the `nest.snapshot` endpoint, its contract, the `nestMood` function, the Nest components, hooks, CSS, unit tests and E2E spec.
- Remove the Nest strings from the locale catalogs.
- Revert the upstream files edited for it: `apps/api/src/router.ts`, `apps/web/src/App.tsx`, `apps/web/src/components/SidebarFooter.tsx`, `apps/web/src/pages/Shell.tsx` (Nest lines only; the takeover booting watch stays), `packages/contracts/src/index.ts`, `packages/contracts/src/rpc.ts`, `packages/core/src/index.ts`, and the twelve `apps/web/src/locales/*/messages.po`.
- Remove the `the-nest` spec. The archived `the-nest-dashboard` change stays as history.
- The unmerged phase 2 proposal is dropped; nothing from it merges.

## Impact

No data or schema changes. Nothing else depends on the removed code.
