/**
 * Akses data (milik Agent B).
 * Skema: ./schema · migrasi: supabase/migrations · dokumen kolom: README.md
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';
export { DEFAULT_SETTINGS } from './default-settings';

export function createSupabaseServiceClient(
  url: string = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  serviceRoleKey: string = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diset di environment',
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function buildDb(databaseUrl: string) {
  // idle_timeout: koneksi menganggur ditutup (default postgres.js: tidak pernah).
  // max: default 10 per instance serverless cepat menghabiskan kuota session pooler Supabase.
  const client = postgres(databaseUrl, { prepare: false, idle_timeout: 20, max: 3 });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof buildDb>;

// Satu klien per URL per proses. Dulu setiap request membuat pool baru (TCP+TLS+auth ke
// Singapura) dan tidak pernah menutupnya. globalThis agar bertahan melewati HMR di dev.
const g = globalThis as { __ekasatraDb?: Map<string, Db> };

/**
 * Klien Drizzle langsung ke Postgres (bypass RLS — hanya dipakai di server).
 * `prepare: false` agar kompatibel dengan pooler Supabase mode transaction.
 * Dipanggil berulang aman: URL yang sama memakai ulang klien yang sama.
 */
export function createDb(databaseUrl: string = process.env.DATABASE_URL ?? ''): Db {
  if (!databaseUrl) throw new Error('DATABASE_URL wajib diset di environment');
  const cache = (g.__ekasatraDb ??= new Map());
  let db = cache.get(databaseUrl);
  if (!db) {
    db = buildDb(databaseUrl);
    cache.set(databaseUrl, db);
  }
  return db;
}
