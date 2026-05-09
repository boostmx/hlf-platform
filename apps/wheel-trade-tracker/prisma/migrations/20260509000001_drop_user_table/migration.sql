-- Drop the local "User" table. User identity now lives exclusively in the
-- shared auth DB (@hlf/auth-db). FK constraints from Portfolio/WatchlistItem/
-- JournalEntry to "User" were already dropped in
-- 20260509000000_drop_user_fk_constraints, so this is a clean DROP.

DROP TABLE "User";
