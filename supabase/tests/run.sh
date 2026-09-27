#!/usr/bin/env bash
# Replays every migration on a throwaway Postgres database, replays the recent
# ones a second time (idempotence), then checks the access rules.
# Uses the usual PG* variables; never point it at a Supabase project.
set -euo pipefail

cd "$(dirname "$0")/../.."
DB="${KOREV_TEST_DB:-korev_migrations_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"

dropdb --if-exists "$DB" 2>/dev/null
createdb "$DB"
"${PSQL[@]}" -f supabase/tests/platform_stubs.sql >/dev/null 2>&1

for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -1 -f "$f" >/dev/null || { echo "Migration failed: $f" >&2; exit 1; }
done
echo "All migrations applied."

for f in supabase/migrations/202609*.sql; do
  "${PSQL[@]}" -1 -f "$f" >/dev/null || { echo "Migration not idempotent: $f" >&2; exit 1; }
done
echo "Recent migrations replay cleanly."

status=0
PGOPTIONS="-c client_min_messages=notice" "${PSQL[@]}" -f supabase/tests/access_rules.sql 2>&1 | sed -n 's/.*NOTICE:  //p; /ERROR/p' || status=$?
dropdb "$DB"
exit "$status"
