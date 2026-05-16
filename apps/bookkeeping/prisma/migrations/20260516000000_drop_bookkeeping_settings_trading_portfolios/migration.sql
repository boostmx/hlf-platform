-- Drop `tradingPortfolios` from BookkeepingSettings. The setting moved to
-- @hlf/auth-db's `User.tradingPortfolios` (shared across portal + bookkeeping)
-- on 2026-05-16. Existing values were backfilled into the new column before
-- this migration ran.
ALTER TABLE "BookkeepingSettings" DROP COLUMN IF EXISTS "tradingPortfolios";
