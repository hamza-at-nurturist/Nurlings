-- Additive only: a defaulted column and a nullable column, so the previous release keeps
-- working beside this one while migrations apply.

-- AlterTable
ALTER TABLE "ticket_comments" ADD COLUMN "mentions" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "ticketWake" TEXT;
