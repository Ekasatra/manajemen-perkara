#!/usr/bin/env bash
# Migrasi bersih dari nol di Postgres 17 (Docker, throwaway) + uji perilaku. Tidak menyentuh remote.
set -euo pipefail
cd "$(dirname "$0")"

C="ekasatra-verify-$$"
docker run -d --rm --name "$C" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=pw postgres:17 >/dev/null
trap 'docker rm -f "$C" >/dev/null 2>&1 || true' EXIT

# -h 127.0.0.1: server sementara saat init hanya mendengar di socket, jadi TCP = server final.
until docker exec "$C" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 1; done

psql() { docker exec -i "$C" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }

echo "→ bootstrap (stub auth/storage/roles)"
psql < bootstrap.sql

for f in ../migrations/*.sql; do
  echo "→ migrasi $(basename "$f")"
  psql < "$f"
done

echo "→ verify.sql"
psql -At < verify.sql

echo "→ seed.ts (settings idempoten; Admin gagal karena env tidak diisi = perilaku benar)"
port=$(docker port "$C" 5432/tcp | head -1 | sed 's/.*://')
(
  cd ../../packages/db
  export DATABASE_URL="postgres://postgres:pw@127.0.0.1:$port/postgres"
  want=$(node --input-type=module -e "import {DEFAULT_SETTINGS as d} from './src/default-settings.ts'; console.log(Object.keys(d).length)")
  for _ in 1 2; do
    if env -u SEED_ADMIN_EMAIL -u SEED_ADMIN_PASSWORD node src/seed.ts >/dev/null 2>&1; then
      echo "FAIL: seed seharusnya gagal tanpa SEED_ADMIN_*"; exit 1
    fi
  done
  got=$(docker exec "$C" psql -U postgres -At -c "select count(*) from settings")
  [ "$got" = "$want" ] || { echo "FAIL: settings=$got, expected $want"; exit 1; }
  echo "settings=$want OK (2× run, idempoten)"
)

echo "→ next_counter paralel (20 klien × 50 panggilan)"
printf "select next_counter('T/CONC');\n" | docker exec -i "$C" sh -c 'cat > /tmp/c.sql'
docker exec "$C" pgbench -U postgres -n -c 20 -j 4 -t 50 -f /tmp/c.sql postgres >/dev/null
got=$(psql -At -c "select value from counters where key='T/CONC'")
[ "$got" = "1000" ] || { echo "FAIL: counter=$got, expected 1000 (lost update)"; exit 1; }
echo "counter=1000 OK"

echo "SEMUA OK"
