-- Drop FK constraints from per-user wheel tables to the local "User" table.
-- After this migration, userId is an opaque string referring to the canonical
-- user row in the shared auth DB (@hlf/auth-db). The local "User" table is
-- left in place during bake-in; a follow-up migration will drop it.

ALTER TABLE "Portfolio" DROP CONSTRAINT "Portfolio_userId_fkey";
ALTER TABLE "WatchlistItem" DROP CONSTRAINT "WatchlistItem_userId_fkey";
ALTER TABLE "JournalEntry" DROP CONSTRAINT "JournalEntry_userId_fkey";
