-- Adopt this DB to the shared HLF auth model.
-- After this migration, userId fields are opaque references to user IDs in
-- the shared @hlf/auth-db DB. The local "User" table and any rows tied to
-- standalone-only userIds are left intact during bake-in; a follow-up
-- migration will drop "User" once the new app is verified.

-- Drop FK constraints from per-user tables to the local "User" table. Use
-- IF EXISTS so this migration is also a no-op on fresh DBs that wouldn't
-- have these constraints (those FKs only existed in the standalone schema).
ALTER TABLE "Ticker"       DROP CONSTRAINT IF EXISTS "Ticker_createdBy_fkey";
ALTER TABLE "HiddenTicker" DROP CONSTRAINT IF EXISTS "HiddenTicker_userId_fkey";
ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS "Subscription_userId_fkey";
ALTER TABLE "Alert"        DROP CONSTRAINT IF EXISTS "Alert_userId_fkey";
ALTER TABLE "UserPosition" DROP CONSTRAINT IF EXISTS "UserPosition_userId_fkey";

-- Add the per-user preferences table (notification + threshold settings).
-- Replaces the standalone User.discordWebhook/emailEnabled/thresholds/
-- watchedPortfolioIds fields, which are app-specific and don't belong in
-- the shared auth User model.
CREATE TABLE "UserPreferences" (
  "userId"              TEXT PRIMARY KEY,
  "emailEnabled"        BOOLEAN NOT NULL DEFAULT TRUE,
  "discordWebhook"      TEXT,
  "thresholds"          JSONB,
  "watchedPortfolioIds" JSONB,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL
);
