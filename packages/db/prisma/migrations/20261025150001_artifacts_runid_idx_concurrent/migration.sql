-- Sole statement so CREATE INDEX CONCURRENTLY runs outside an implicit
-- transaction (see prior concurrent index migrations). Ticket files and card
-- counts find the artifacts a run attached.
CREATE INDEX CONCURRENTLY "artifacts_runId_idx" ON "artifacts"("runId");
