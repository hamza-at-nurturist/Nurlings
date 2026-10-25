# Design

## Evidence

- Chat upload: the composer calls `artifacts.create({ botId, name, mimeType, contentBase64 })` per
  file (after `prepareImage`), then `threads.send({ artifactIds })`. `resolveSendAttachments`
  (`apps/api/src/artifacts.ts`) accepts only artifacts of that bot, space and user, and turns them
  into `file` / `image` message blocks.
- Chat reading: the executor takes the run's user turn message (`userTurnMessageForRun` in
  `packages/core`), lists its file blocks with `listCurrentTurnFiles` as `attachments/<id>.<ext>`
  paths in the run instructions, and copies them onto the computer with
  `materializeCurrentTurnFiles` the first time a tool needs the computer, through the run's
  `pendingTurnFiles` queue. Steering messages push their blocks onto the same queue mid-run.
- `userTurnMessageForRun` returns nothing for the `tickets` trigger: a ticket run has no user turn
  message, so chat attachments never reach it, and nothing would reach it from a ticket either.
- The `ticket_get` tool is dispatched inside the run's closure in `executor.ts`, where
  `pendingTurnFiles` is in scope.
- Ticket files today: `listTicketFiles` returns artifacts of runs whose task belongs to the ticket.

## Decisions

### 1. Uploads hang off the comment that carried them

`ticket_comments.attachments` stores the same file blocks a chat message stores. The feed can show
files on their comment, the Files list unions them with run artifacts, and `ticket_get` hands the
blocks to the existing copy path unchanged. Alternative: a nullable `artifacts.ticketId`, which edits
an upstream table and the upstream `artifacts.create` contract.

### 2. Dropping stages, sending uploads

A drop on the modal adds files to the reply box, as a drop on the chat composer does. Uploading on
drop would create artifacts for files the user then removes, and needs a second path to attach
without a comment.

### 3. Nurlings read through `ticket_get` and the chat copy queue

`getTicket` returns `files` (metadata with chat paths, for the tool result) and the file blocks. In
the `ticket_get` branch, the executor pushes the blocks onto `pendingTurnFiles` and returns the
result without them. Copying, size limits, workspace checkpointing and "only when a tool needs the
computer" all come from the chat code. This is the only `executor.ts` edit and it carries no
policy. Alternatives: make `userTurnMessageForRun` return a synthetic message for ticket runs (a
`packages/core` change plus a fake message), or copy files from the ticket tools (a second copy path,
which the brief rules out).

### 4. Uploads belong to the ticket's owner

`artifacts.create` needs a bot or a group. The reply box uploads for the ticket's owner, so the
upload also appears in that Nurling's files, as a chat upload does. The server validates with the
owner as the bot. A ticket without an owner offers no attach control.

### 5. A files-only comment is a reply

It wakes the owner and moves a ticket in review or blocked back to In progress, like any user comment.

### 6. Images reach the model as tool-result images

`computer_observe` already returns an `agent_tool_result` whose content mixes text and PNG/JPEG
images, and the runtime forwards it unflattened; only `details` is stored as the effect result. The
ticket reader returns that shape when the run's model accepts images (`acceptsImages`), with the
newest 4 PNG/JPEG images of the ticket, read through the artifact store and capped at chat's
attachment size. Otherwise it returns the plain JSON result. Alternative: copy only to disk and let
the Nurling open them with a tool, which no file tool turns into model vision.

## Risks

- Each `ticket_get` call resends up to 4 images, which costs context; the cap bounds it.
- Large uploads on a ticket count toward the same per-file limit as chat; nothing new is enforced.
- A reassigned ticket keeps uploads that belong to the previous owner's files. They stay readable,
  because reading checks the space and user, not the bot.
