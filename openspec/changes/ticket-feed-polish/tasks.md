# Tasks

## 1. API and contracts
- [ ] 1.1 Add `resumed` to `TICKET_EVENT_KINDS`; `commentTicket` records it (no actor, status `doing`) instead of `status` when a reply sends the ticket back; tests updated in `ticket-tools.test.ts` / postgres tests
- [ ] 1.2 Add `tickets.runs` (contract + router + db helper): latest run per Nurling for tasks with this `ticketId` as `{ botId, status, finishedAt }`; isolation test for another space's ticket

## 2. Feed model
- [ ] 2.1 `activity.ts`: add `file` and `run` item kinds (files from `tickets.files`, failed latest run), sorted with the rest; unit tests
- [ ] 2.2 `use-ticket-activity.ts`: load `tickets.runs`, poll every 4 s only while a run is queued/leased/running

## 3. Feed UI (`ActivityFeed.tsx`)
- [ ] 3.1 File lines, `resumed` line, failed-run line, working line with `Shimmer`
- [ ] 3.2 Time separators via `needsTimeSeparator` + shell `TimeSeparator`; tight spacing between close items
- [ ] 3.3 File cards: producer in meta line ("Runway · 7.3 KB"), drop the caption (`TicketFileCard`, `TicketFiles`)

## 4. Modal
- [ ] 4.1 Expand/collapse icon button in the header, guarded `localStorage`, accessible names
- [ ] 4.2 Lingui: `pnpm --filter @rakazo/web intl:extract` + translate/compile as the repo does

## 5. Verify
- [ ] 5.1 Update `TicketModal.test.tsx` and `activity.test.ts` for every scenario above
- [ ] 5.2 Typecheck, lint, unit tests for web, api, adapters, core
- [ ] 5.3 Board e2e screenshot of the modal for the PR (CI runs e2e; not run locally)
