# Proposal

## Why

A ticket can only carry files its Nurling produced. To hand a Nurling the brief, a spreadsheet or a
screenshot it needs for the ticket, you have to leave the board, attach it in chat, and hope the
ticket run finds it. It doesn't: ticket runs never see chat attachments. This change lets you attach
files on the ticket itself, and makes every Nurling working the ticket able to open them.

## What Changes

### Attaching (web and desktop)

- The reply box gets the same attach control chat uses (the round `+` button, `Attach file`), with
  the same accepted types, count and size limits, image downscaling and "Skipped …" notice.
- Dropping files anywhere on the modal stages them in the reply box, the same as dropping onto the
  chat composer. Nothing uploads until you send.
- Sending uploads each file through the existing `artifacts.create` RPC (as the chat composer does),
  then posts the comment with the file ids. A comment may be files only, no text.
- The comment shows its files in the feed as the existing file cards.
- The Files list shows your uploads next to the Nurling's files. Each card is labelled with who added
  it: "You", or the Nurling's name.
- A ticket without an owner shows no attach control (an upload belongs to a Nurling, as in chat).

### Nurlings reading the files

- `ticket_get` returns the ticket's files (yours and the Nurlings'), each with its name, type, size,
  who added it, and the same `attachments/<id>.<ext>` path chat attachments use.
- The files are copied onto the Nurling's computer at those paths, on first use of a file tool, by the
  same code that copies chat attachments. It applies to the owner and to a mentioned Nurling alike,
  since both read the ticket with `ticket_get`.

### Backend, additive only

- `ticket_comments.attachments`: JSON list of file blocks (`{ kind: "file" | "image", artifactId,
  name, mimeType, size }`, the chat message block shape), default empty.
- `CommentTicketInput` gains optional `artifactIds`; `body` may be empty when there are files.
  `TicketComment` gains `attachments` (default empty).
- `tickets.comment` validates the ids with the chat send rule (`resolveSendAttachments`: same space,
  same user, the ticket's owner as the bot), and refuses any other id.
- `tickets.files` also returns the files attached to comments, newest version of each.

### Mobile

Mobile has no board screen. Nothing changes there.

### Proposed copy

None new. The attach control reuses `Attach file`, the notice reuses `Skipped {0}`, the label reuses
`You` (or the Nurling's name). No drop hint text: the modal shows a highlighted border while files
are dragged over it.

### Upstream merge safety

| File | Edit |
|---|---|
| `packages/db/prisma/schema.prisma` + one migration | `TicketComment.attachments` |
| `packages/contracts/src/board.ts` | `artifactIds` on the comment input, `attachments` on the comment |
| `packages/db/src/board.ts` | parse `attachments` in the DTO; comment files in `listTicketFiles` |
| `packages/adapters/src/ticket-tools.ts` | store attachments; `getTicket` returns files and their blocks |
| `packages/adapters/src/builtin-tools.ts` | `ticket_get` description mentions files |
| `packages/adapters/src/executor.ts` | **one change**: the `ticket_get` branch pushes the returned file blocks onto the run's existing `pendingTurnFiles` queue and leaves the blocks out of the tool result (about four lines) |
| `apps/api/src/router.ts` | the comment handler validates `artifactIds` with `resolveSendAttachments` |
| `TicketModal/{ReplyBox,ActivityFeed,TicketFiles,TicketModal}.tsx` | attach control, drop, file cards, labels |

`Board.tsx` and `packages/core` are not touched.

### Not changed, on purpose

- No new upload endpoint, storage path or copy-to-computer code.
- No inline image input for ticket runs. Chat feeds images of the current turn to the model directly;
  a ticket run sees its images as files on the computer, as it does for any earlier chat attachment.
- No deleting or renaming of uploads from the ticket.

## Decisions to approve

See `design.md`. The executor change is the one point to look at: it is the only way to reuse the
chat copy path, because a ticket run has no user turn message.

## Impact

- Capability: extends `board-tickets`.
- Prisma migration: one defaulted JSON column on `ticket_comments`, additive.
- API: `tickets.comment` gains optional `artifactIds`; comments gain `attachments`. No new RPC.
- Behaviour change: a ticket run may copy files onto the Nurling's computer when it uses a file tool.
- Contacts no Rakazo-owned infrastructure.
