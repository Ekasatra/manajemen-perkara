import { defineConfig } from 'drizzle-kit';

// Sumber migrasi tunggal: supabase/migrations (SQL tulis-tangan dibuat dengan `generate --custom`).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: '../../supabase/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
