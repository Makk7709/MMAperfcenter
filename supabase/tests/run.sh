#!/usr/bin/env bash
# Replays every migration on a throwaway Postgres database the way
# `supabase db push` does (Supabase CLI, when installed), replays the recent
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

if command -v supabase >/dev/null 2>&1; then
  # The CLI does not send BEGIN: statements that need an explicit transaction
  # block fail here as they would in production, unlike with `psql -1`.
  host="${PGHOST:-127.0.0.1}"
  [[ "$host" == /* ]] && host=127.0.0.1
  url="postgresql://${PGUSER:-postgres}${PGPASSWORD:+:$PGPASSWORD}@${host}:${PGPORT:-5432}/${DB}"
  log="$(mktemp)"
  PGSSLMODE=disable supabase migration up --db-url "$url" >"$log" 2>&1 \
    || { grep -v "NOTICE" "$log" >&2; echo "Supabase CLI failed to apply the migrations" >&2; exit 1; }
  rm -f "$log"
  echo "All migrations applied (Supabase CLI)."
else
  echo "Supabase CLI not found: applying with psql -1 (less faithful to db push)." >&2
  for f in supabase/migrations/*.sql; do
    "${PSQL[@]}" -1 -f "$f" >/dev/null || { echo "Migration failed: $f" >&2; exit 1; }
  done
  echo "All migrations applied (psql)."
fi

for f in supabase/migrations/202609*.sql; do
  "${PSQL[@]}" -1 -f "$f" >/dev/null || { echo "Migration not idempotent: $f" >&2; exit 1; }
done
echo "Recent migrations replay cleanly."

status=0
PGOPTIONS="-c client_min_messages=notice" "${PSQL[@]}" -f supabase/tests/access_rules.sql 2>&1 | sed -n 's/.*NOTICE:  //p; /ERROR/p' || status=$?
dropdb "$DB"
exit "$status"
