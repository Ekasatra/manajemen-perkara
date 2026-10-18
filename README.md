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

Email transaksional (W4 R2) memakai SMTP Gmail Workspace (`smtp.gmail.com:465`). Isi `SMTP_USER` + `SMTP_PASS` (App Password) di environment Vercel. Tanpa env ini, email no-op + warning di log (dev tidak error). Fallback Resend (`RESEND_API_KEY`) tetap didukung.

CI (`.github/workflows/ci.yml`) menjalankan `typecheck`, `lint`, `test`, dan `build` di setiap PR dan push ke `main`.
