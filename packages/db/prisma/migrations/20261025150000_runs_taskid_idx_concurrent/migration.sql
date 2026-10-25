-- Sole statement so CREATE INDEX CONCURRENTLY runs outside an implicit
-- transaction (see prior concurrent index migrations). Ticket files and card
-- counts find a ticket's runs by task.
CREATE INDEX CONCURRENTLY "runs_taskId_idx" ON "runs"("taskId");
