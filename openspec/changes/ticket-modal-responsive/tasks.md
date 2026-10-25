# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal, the decisions in `design.md` and the more-menu
  question (left out). Verify: explicit approval in the session.

## 2. Shared pieces

- [x] 2.1 `use-narrow-modal.ts`, `use-swipe.ts`, `use-visual-viewport.ts`. Verify: unit tests for
  the breakpoint, swipe thresholds and the field exclusion.
- [x] 2.2 `activity-seen.ts`. Verify: unit tests for the count, own items, first open, prune to
  200 and blocked storage.
- [x] 2.3 `TicketImage.tsx` and the image grid in `TicketFiles.tsx` (both widths), full-width
  cards on narrow. Verify: unit test that images land in the grid, other files don't, and a tap
  opens the viewer.

## 3. Narrow sheet

- [x] 3.1 Lift the ticket pane into `TicketPane.tsx`; `TicketModal` switches layouts. Verify:
  existing `TicketModal.test.tsx` passes unchanged.
- [x] 3.2 `Properties` chips layout and `DatePicker` `chip`. Verify: chips render 44px
  triggers that open the same menus.
- [x] 3.3 `NarrowTicket.tsx`: header, tabs, swipe, keep-mounted panels, scroll to newest, pinned
  Approve, `LatestActivity`, `ClampedDescription`, count badge, safe-area padding, visual-viewport
  height. Verify: unit tests from `design.md` §9.
- [x] 3.4 `ReplyBox` `touch`: 16px text, 44px controls. Verify: unit test of the classes.

## 4. Desktop polish

- [x] 4.1 Ticket pane `px-10 py-8`, activity pane 26rem. Verify: board e2e desktop screenshot.

## 5. Copy and checks

- [x] 5.1 Extract and compile catalogs. Verify: `lingui extract` adds only the copy in the
  proposal.
- [x] 5.2 Typecheck, lint, unit tests. Verify: all pass.

## 6. E2E and PR

- [ ] 6.1 `apps/web/e2e/ticket-mobile.spec.ts` at 390×844 with the two screenshots. Verify: passes
  locally and in CI.
- [ ] 6.2 Open the PR with Why/What/Testing, the copy table and links to both phone screenshots.
  Verify: CI green.
- [ ] 6.3 After merge, archive the change on its own PR. Verify: `openspec validate --strict`.
