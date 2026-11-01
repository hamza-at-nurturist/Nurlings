# Proposal

## Why

A Nurling's notes live in one `MEMORY.md`, so a fact it learns on a ticket cannot be traced back
to that ticket, and nobody can search what was learned on one. The link is only recoverable by
joining revisions to runs to tasks.

## What Changes

- When a Nurling saves a note with `remember` (or `save_memory` on a connected provider) during a
  run that is working a ticket, the server prefixes the fact with the ticket ref, for example
  `[NUR-12] Client wants invoices as PDF`. The owner and mentioned Nurlings are both tagged.
- Runs not working a ticket, and shared memory (`save_shared_memory`), are unchanged.
- The server adds the tag from the run's task; the model does not choose it.

## Out of scope

- No schema change, migration or new UI. Existing notes stay untagged.
- No ticket-scoped notes document or per-ticket recall tool.

## Impact

Exempt from a design doc: one small decision (inline tag over a new table), made with the
maintainer. Tests: a unit test for the tag helper.
