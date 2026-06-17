-- Migration: convert status column from TEXT to FormStatus enum
-- Depends on: 20260616_feat_form_status (status TEXT column must exist)

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('draft', 'published', 'closed');

-- AlterTable: cast existing text values to enum
-- All valid values ('draft', 'published', 'closed') are preserved
-- Any invalid value will cause this migration to fail (intentional — reveals corrupt data)
ALTER TABLE "Form"
  ALTER COLUMN "status" TYPE "FormStatus" USING "status"::"FormStatus";
