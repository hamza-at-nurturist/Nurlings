# Tasks

## 1. Approval

- [x] 1.1 Maintainer approves the proposal and the five decisions in it. Verify: explicit approval
  in the session.

## 2. Backend

- [x] 2.1 Prisma: `TicketComment.mentions` (JSON, default empty) and `Task.ticketWake` (nullable
  text) in one additive migration. Verify: the migration applies on an empty and an existing
  database; the row-security coverage test still passes; the previous release's queries still work.
- [x] 2.2 Contracts: optional `mentions` on `CommentTicketInput` and `TicketCommentSchema`. Verify:
  contract tests accept old shapes, accept and reject new ones.
- [x] 2.3 `commentTicket` validates and stores mentions (same space, same user, not archived; the
  user kind forced to the commenting Nurling's user) and passes the bots to wake on the change.
  Verify: unit tests for valid, foreign, archived and forged ids, and for a body without the
  `@Name` text.
- [x] 2.4 `ticket-mentions.ts`: `wakeMentionedBot` with the self, owner, queued-coalesce, working and
  cap rules, the mention prompt and `ticketWake`; user mentions exempt from working and cap.
  Verify: unit tests for each scenario in the spec, including the cap boundary at 10 and 11 and the
  one-hour window.
- [x] 2.5 Comment-only runs in the ticket tools, not `executor.ts`: `activeMentionTask` in
  `ticket-mentions.ts`; `updateTicket` refuses every update and `commentTicket` refuses
  a second comment while the bot has an active mention task for that ticket. Verify: unit tests for
  both refusals (every field), for other tickets being allowed, for an owner's ordinary run
  being unaffected, and for a queued (not yet running) task not counting.
- [x] 2.6 `ticket_comment` gains `mention_bots` and `mention_user`; tool description tells the model
  to write `@Name` in the text. Verify: tool schema test and an executor test that the two arguments reach `commentTicket`
  (the only `executor.ts` change: two argument lines).
- [x] 2.7 User notification through the existing provider for `mention_user`, honouring
  notify-on-finish, never failing the comment. Verify: unit tests for sent, setting off, no provider,
  and provider failure.

## 3. Web

- [x] 3.1 `mentionColor` helper and `MentionText` (text with chips; neutral for users and non-hex
  colors). Verify: unit tests for `#hex::shape_8`, a 3-digit hex, a named color, an image value and
  an unknown id.
- [x] 3.2 `MentionPicker` in the reply box: opens on `@`, filters, keyboard navigation, chips with the
  existing remove label, sends `mentions`. Verify: component tests for open, filter, pick, remove,
  escape, and that only mentions still in the text are sent.
- [x] 3.3 Feed renders comments with mentions through `MentionText`; comments without mentions stay
  markdown. Verify: component test for both.
- [x] 3.4 Lingui: extract and compile. Verify: no new untranslated source strings beyond the ones
  quoted in the PR.

## 4. Evidence

- [ ] 4.1 Extend `apps/web/e2e/board.spec.ts`: type `@`, pick a second Nurling, send, see its
  tinted chip in the feed; capture a screenshot. Verify: CI E2E passes and the screenshot is
  linked in the PR.

## 5. Checks

- [x] 5.1 `openspec validate ticket-mentions --strict`, typecheck, lint and the unit suites pass.

## 6. After merge

- [ ] 6.1 Archive the change.
