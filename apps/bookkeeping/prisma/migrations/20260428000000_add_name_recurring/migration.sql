-- Add name and recurring fields to BookkeepingEntry
-- name is nullable so existing entries without a name stay valid
ALTER TABLE "BookkeepingEntry" ADD COLUMN "name" TEXT;
ALTER TABLE "BookkeepingEntry" ADD COLUMN "recurring" BOOLEAN NOT NULL DEFAULT false;
