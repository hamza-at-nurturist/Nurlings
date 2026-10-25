-- Additive only: nullable and defaulted columns plus an index, so the previous release keeps
-- working beside this one while migrations apply.

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "startHasTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dueAt" TIMESTAMP(3),
ADD COLUMN "dueHasTime" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "startWokenAt" TIMESTAMP(3),
ADD COLUMN "dueWarnedAt" TIMESTAMP(3),
ADD COLUMN "overdueNotifiedAt" TIMESTAMP(3),
ADD COLUMN "scheduleAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "tickets_scheduleAt_idx" ON "tickets"("scheduleAt");
