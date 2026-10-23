# Proposal

## Why

Ticket numbers read "RAK-1" because a board's ticket prefix defaults to `RAK`, the upstream
product's abbreviation. Customers see it on every ticket card, in the ticket detail, and in the
prompt that wakes a bot to work a ticket. It should read "NUR-1".

The prefix is a brand value, so it belongs in the brand configuration with the other values the
product shows, not in a database default.

## What Changes

- `packages/brand/brand.json` gets a `ticketPrefix` entry, set to `NUR`. The brand schema validates
  it with the same rule the board rename already enforces (a letter, then letters or digits, at
  most the existing maximum length), and normalises to upper case.
- `ensureBoard` (`packages/db/src/board.ts`), the only place a board is created, passes
  `brand.ticketPrefix` explicitly. All five server callers and the bot ticket tools go through it,
  so no caller changes.
- Boards that already exist and still carry the untouched `RAK` default are moved to `NUR` by a
  one-statement data migration (see Decision).
- Renaming a board's prefix keeps working exactly as today.

### Not changed, on purpose

- The Prisma column default stays `"RAK"`. Changing it needs a schema migration and an edit to the
  upstream-owned `schema.prisma` for no behavioural gain, since nothing creates a board without going through `ensureBoard`.
- The ticket reference parser and ticket tools already take the prefix from the board row, so they
  need no change.
- Tests that use `RAK` as a literal fixture prefix stay as they are.

### Upstream merge safety

| File | Edit |
|---|---|
| `packages/db/src/board.ts` | one import and one field in `ensureBoard` |
| `packages/db/package.json`, `pnpm-lock.yaml` | workspace dependency on `@nurlings/brand` |
| `packages/brand/brand.json`, `packages/brand/src/schema.ts` | our own files |

New: one migration directory, so it cannot conflict with upstream history.

## Decision for the maintainer: migrate existing boards?

The migration is `UPDATE boards SET "ticketPrefix" = 'NUR' WHERE "ticketPrefix" = 'RAK'`. It is
trivial and additive in the deploy sense (old and new API code both read the column fine). Two
caveats:

- It cannot tell a board that kept the default from one whose owner chose `RAK` on purpose.
  Boards were added about two weeks ago, so this is unlikely, but it is a guess.
- Text that already mentions a ticket as `RAK-12` (comments, chat) stops resolving to the ticket.
  Refs are parsed against the board's current prefix only.

Recommendation: include the migration, since the boards feature is new and a mix of `NUR-` and
`RAK-` boards in one deployment would be worse. If you would rather leave existing boards alone,
drop task 2.3 and the "Existing boards" scenario; nothing else changes.

## Impact

- Capability: `brand-config` (new requirement).
- No API or contract change. No new words on screen.
- One data migration (optional, see above).
