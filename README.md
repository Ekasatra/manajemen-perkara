# EKASATRA — Manajemen Surat & Perkara (v2)

Monorepo pnpm: `apps/web` (Next.js: UI + API `/api/v1`), `packages/db` (skema Drizzle), `packages/core`
(logika bisnis + policy), `packages/shared` (kontrak zod/tipe untuk web dan mobile nanti).

## Menjalankan

```bash
pnpm install
cp .env.example apps/web/.env.local   # dibaca Next.js (pnpm dev)
cp .env.example .env                  # dibaca seed/drizzle di packages/db
pnpm dev
```

Isi nilai dari dashboard project Supabase `ekasatra-staging`. Jangan commit `.env*` selain `.env.example`.

CI (`.github/workflows/ci.yml`) menjalankan `typecheck`, `lint`, `test`, dan `build` di setiap PR dan push ke `main`.
