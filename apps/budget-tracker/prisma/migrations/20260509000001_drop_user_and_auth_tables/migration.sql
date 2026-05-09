-- Drop the local "User" table plus the unused NextAuth Account / Session /
-- VerificationToken tables. User identity now lives exclusively in the
-- shared auth DB (@hlf/auth-db). NextAuth uses JWT strategy, so the adapter
-- tables were never read at runtime.
--
-- userId columns on per-user models (Transaction, RecurringTransaction,
-- Category, MonthlyBudget, NetWorthSnapshot, BtAsset, BtLiability,
-- Investment, FIREProfile, SavingsGoal) remain as opaque references.

ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_userId_fkey";
ALTER TABLE "RecurringTransaction" DROP CONSTRAINT "RecurringTransaction_userId_fkey";
ALTER TABLE "Category" DROP CONSTRAINT "Category_userId_fkey";
ALTER TABLE "MonthlyBudget" DROP CONSTRAINT "MonthlyBudget_userId_fkey";
ALTER TABLE "NetWorthSnapshot" DROP CONSTRAINT "NetWorthSnapshot_userId_fkey";
ALTER TABLE "BtAsset" DROP CONSTRAINT "BtAsset_userId_fkey";
ALTER TABLE "BtLiability" DROP CONSTRAINT "BtLiability_userId_fkey";
ALTER TABLE "Investment" DROP CONSTRAINT "Investment_userId_fkey";
ALTER TABLE "FIREProfile" DROP CONSTRAINT "FIREProfile_userId_fkey";
ALTER TABLE "SavingsGoal" DROP CONSTRAINT "SavingsGoal_userId_fkey";

DROP TABLE "Account";
DROP TABLE "Session";
DROP TABLE "VerificationToken";
DROP TABLE "User";
