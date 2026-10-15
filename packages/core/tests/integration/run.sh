#!/usr/bin/env bash
# Postgres 17 throwaway + migrasi dari nol, lalu jalankan tes integrasi surat. Tidak menyentuh remote.
set -euo pipefail
cd "$(dirname "$0")/../../../.."   # root repo
C="ekasatra-surat-int-$$"
docker run -d --rm --name "$C" -p 127.0.0.1::5432 -e POSTGRES_PASSWORD=pw postgres:17 >/dev/null
trap 'docker rm -f "$C" >/dev/null 2>&1 || true' EXIT
until docker exec "$C" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; do sleep 1; done
psql() { docker exec -i "$C" psql -U postgres -v ON_ERROR_STOP=1 -q "$@"; }
psql < supabase/local/bootstrap.sql
for f in supabase/migrations/*.sql; do psql < "$f"; done
port=$(docker port "$C" 5432/tcp | head -1 | sed 's/.*://')
cd packages/core
TEST_DATABASE_URL="postgres://postgres:pw@127.0.0.1:$port/postgres" npx vitest run tests/integration
