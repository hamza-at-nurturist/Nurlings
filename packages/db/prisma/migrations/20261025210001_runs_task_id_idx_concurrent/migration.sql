-- Sole statement so CREATE INDEX CONCURRENTLY runs outside an implicit
-- transaction. IF NOT EXISTS because the Nurlings fork created this same index earlier
-- (20261025150000_runs_taskid_idx_concurrent). Deleting a task cascades to its runs by taskId, which scanned
-- the whole runs table without this index.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "runs_taskId_idx" ON "runs"("taskId");
