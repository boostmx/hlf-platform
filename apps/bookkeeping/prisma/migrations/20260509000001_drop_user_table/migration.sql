-- Drop the local "User" table. User identity now lives exclusively in the
-- shared auth DB (@hlf/auth-db). userId columns in BookkeepingEntry,
-- BookkeepingMonthNote, and BookkeepingSettings remain as opaque references.

ALTER TABLE "BookkeepingEntry" DROP CONSTRAINT "BookkeepingEntry_userId_fkey";
ALTER TABLE "BookkeepingMonthNote" DROP CONSTRAINT "BookkeepingMonthNote_userId_fkey";
ALTER TABLE "BookkeepingSettings" DROP CONSTRAINT "BookkeepingSettings_userId_fkey";

DROP TABLE "User";
