/**
 * Akses data (milik Agent B).
 * Skema Drizzle 17 tabel + migrasi akan ditambahkan pada task B1–B6.
 * Placeholder ini hanya menyediakan klien Supabase untuk digunakan scaffold.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
