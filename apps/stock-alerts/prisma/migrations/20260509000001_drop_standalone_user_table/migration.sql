-- Drop the standalone "User" table. User identity now lives exclusively in
-- the shared auth DB (@hlf/auth-db). FK constraints from per-user tables
-- were already dropped in 20260509000000_adopt_to_shared_auth.

DROP TABLE IF EXISTS "User";
