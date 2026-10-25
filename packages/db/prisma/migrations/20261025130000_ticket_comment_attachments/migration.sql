-- Additive only: a defaulted column, so the previous release keeps working beside this one while
-- migrations apply.

-- AlterTable
ALTER TABLE "ticket_comments" ADD COLUMN "attachments" JSONB NOT NULL DEFAULT '[]';
