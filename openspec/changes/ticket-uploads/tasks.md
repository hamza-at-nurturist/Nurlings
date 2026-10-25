# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the decisions in `design.md`. Verify: explicit
  approval in the session.

## 2. Backend

- [x] 2.1 Prisma: `TicketComment.attachments` (JSON, default empty) in one additive migration.
  Verify: applies on an empty and an existing database; row-security coverage still passes.
- [x] 2.2 Contracts: optional `artifactIds` on `CommentTicketInput` (body may be empty only with
  files), `attachments` on `TicketCommentSchema` (default empty). Verify: contract tests for old and
  new shapes.
- [x] 2.3 Router: `tickets.comment` validates `artifactIds` with `resolveSendAttachments` and the
  ticket's owner; `commentTicket` stores the blocks. Verify: router and unit tests for valid, foreign
  and too many files, and a files-only comment.
- [x] 2.4 `listTicketFiles` includes comment files, newest version of each. Verify: unit and
  Postgres tests.
- [x] 2.5 `getTicket` returns `files` (with `addedBy` and chat paths) and the blocks; the
  `ticket_get` branch in `executor.ts` queues the blocks on `pendingTurnFiles`. Verify: unit test for
  the tool result; executor test that a following file tool finds the file on the computer.
- [x] 2.5a `ticket-files.ts` returns image content for up to 4 newest PNG/JPEG images when the run
  accepts images, and plain JSON otherwise. Verify: unit tests for with and without vision, the cap,
  WebP skipped, an oversized image skipped, and `details` holding no image bytes.
- [x] 2.6 `ticket_get` description mentions files. Verify: tool schema test.
- [x] 2.7 Postgres test through the app: upload, comment with the file, `tickets.files`,
  `ticket_get` listing. Verify: passes against the real database.

## 3. Web

- [x] 3.1 Reply box attach control and staged files with remove, reusing chat's helpers (accept list,
  limits, `prepareImage`, notice). Verify: component tests for pick, skip, remove and send order
  (uploads, then comment).
- [x] 3.2 Drop on the modal stages files; highlighted border while dragging. Verify: component test.
- [x] 3.3 Feed shows a comment's files; Files list labels "You" or the Nurling. Verify: component tests.
- [x] 3.4 No attach control without an owner. Verify: component test.
- [x] 3.5 Lingui: extract. Verify: no new message ids.

## 4. Evidence

- [ ] 4.1 Extend `apps/web/e2e/board.spec.ts`: attach a file, send, see it in the feed and in Files
  as "You"; capture a screenshot. Verify: CI E2E passes and the screenshot is linked in the PR.

## 5. Checks

- [x] 5.1 `openspec validate ticket-uploads --strict`, typecheck, lint and the unit suites pass.

## 6. After merge

- [ ] 6.1 Archive the change.
