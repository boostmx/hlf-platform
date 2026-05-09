#!/usr/bin/env bash
# One-shot: copy users from wheel-trade-tracker DB into the shared auth DB,
# preserving id/email/username/password/isAdmin/createdAt. Idempotent —
# rows are loaded into a TEMP table and INSERT ... ON CONFLICT DO NOTHING
# guards against re-runs.
#
# Pre-flight (verified 2026-05-09):
#   wheel/bookkeeping/budget User tables byte-identical (md5 039c9ac2...).
#   So userId remap across app DBs is unnecessary — wheel is canonical.
#
# Usage:
#   WHEEL_DATABASE_URL='postgresql://...ballast.proxy.rlwy.net:44433/railway' \
#   AUTH_DATABASE_URL='postgresql://...nozomi.proxy.rlwy.net:14507/railway' \
#   bash packages/auth-db/scripts/seed-from-wheel.sh

set -euo pipefail

: "${WHEEL_DATABASE_URL:?must set WHEEL_DATABASE_URL}"
: "${AUTH_DATABASE_URL:?must set AUTH_DATABASE_URL}"

COLS='id, "firstName", "lastName", email, bio, "avatarUrl", "isAdmin", username, password, "createdAt"'
DUMP=$(mktemp -t auth_seed_users.XXXXXX.csv)
trap 'rm -f "$DUMP"' EXIT

echo "==> dumping users from wheel DB to $DUMP"
psql "$WHEEL_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "\\COPY (SELECT $COLS FROM \"User\" ORDER BY \"createdAt\") TO '$DUMP' WITH (FORMAT csv, NULL '\\N')"
echo "    rows: $(wc -l < "$DUMP" | tr -d ' ')"

echo "==> loading into auth DB"
psql "$AUTH_DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
CREATE TEMP TABLE _stage (LIKE "User" INCLUDING DEFAULTS);
\COPY _stage ($COLS) FROM '$DUMP' WITH (FORMAT csv, NULL '\\N')

INSERT INTO "User" ($COLS)
SELECT $COLS FROM _stage
ON CONFLICT (id) DO NOTHING;

SELECT COUNT(*) AS auth_users FROM "User";
SQL

echo "==> verifying parity"
WHEEL_HASH=$(psql "$WHEEL_DATABASE_URL" -At -c "
  SELECT md5(string_agg(id || email || username || password, '|' ORDER BY id))
  FROM \"User\";
")
AUTH_HASH=$(psql "$AUTH_DATABASE_URL" -At -c "
  SELECT md5(string_agg(id || email || username || password, '|' ORDER BY id))
  FROM \"User\";
")

if [ "$WHEEL_HASH" = "$AUTH_HASH" ]; then
  echo "    OK — wheel and auth user data match (hash: $WHEEL_HASH)"
else
  echo "    MISMATCH — wheel=$WHEEL_HASH  auth=$AUTH_HASH"
  exit 1
fi
