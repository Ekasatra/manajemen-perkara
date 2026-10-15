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

/**
 * Klien Drizzle langsung ke Postgres (bypass RLS — hanya dipakai di server).
 * `prepare: false` agar kompatibel dengan pooler Supabase mode transaction.
 */
export function createDb(databaseUrl: string = process.env.DATABASE_URL ?? '') {
  if (!databaseUrl) throw new Error('DATABASE_URL wajib diset di environment');
  const client = postgres(databaseUrl, { prepare: false });
  return drizzle(client, { schema });
}

export type Db = ReturnType<typeof createDb>;
