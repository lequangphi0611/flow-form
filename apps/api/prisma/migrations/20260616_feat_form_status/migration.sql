-- Migration: replace published (Boolean) with status (String)
-- Run: cd apps/api && npm run db:migrate

ALTER TABLE "Form" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';

-- Migrate existing data: published=true → status='published'
UPDATE "Form" SET "status" = 'published' WHERE "published" = true;

ALTER TABLE "Form" DROP COLUMN "published";
