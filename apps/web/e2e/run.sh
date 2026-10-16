#!/usr/bin/env bash
# H3 E2E terhadap Supabase LOKAL (Docker). Tidak menyentuh staging: semua env diset eksplisit di sini,
# dan nilai yang sudah ada di process.env tidak ditimpa .env/.env.local (Node --env-file maupun Next).
#   Sekali: npx supabase start -x realtime,imgproxy,studio,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
#   Lalu:   bash apps/web/e2e/run.sh
# Browser: Google Chrome terpasang (channel 'chrome'), tanpa unduhan Chromium.
set -euo pipefail
cd "$(dirname "$0")/../../.."   # root repo
SB="npx -y supabase@latest"

eval "$($SB status -o env 2>/dev/null | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
case "$API_URL" in http://127.0.0.1:*|http://localhost:*) ;; *) echo "bukan Supabase lokal: $API_URL" >&2; exit 1 ;; esac

export NEXT_PUBLIC_SUPABASE_URL="$API_URL" NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" DATABASE_URL="$DB_URL"
export SEED_DEMO_PASSWORD="${SEED_DEMO_PASSWORD:-e2e-Rahasia-123}"
export SEED_ADMIN_EMAIL=eko.prasetyo@ekasatra.com SEED_ADMIN_PASSWORD="$SEED_DEMO_PASSWORD" SEED_ADMIN_NAME="Eko Prasetyo"
export SEED_SUPERADMIN_EMAIL="" RESEND_API_KEY="" APP_URL=http://127.0.0.1:3200

$SB db reset >/dev/null
pnpm --filter @ekasatra/db seed >/dev/null
pnpm --filter @ekasatra/db seed:demo >/dev/null
[ -n "${E2E_SKIP_BUILD:-}" ] || pnpm --filter web exec next build >/dev/null
pnpm --filter web exec playwright test "$@"
