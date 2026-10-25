-- Additive only: a defaulted column, so the previous release keeps working beside this one while
-- migrations apply.

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "needsUser" BOOLEAN NOT NULL DEFAULT false;
