/** Konteks Server Component halaman surat (Agent E): db + user dari sesi. */
import { createDb } from '@ekasatra/db';
import { requireUser } from '@ekasatra/core';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function pageCtx() {
  // cookies() dulu: menandai halaman dinamis sebelum createDb() butuh DATABASE_URL (build).
  const supabase = await createSupabaseServerClient();
  const db = createDb();
  const user = await requireUser(db, supabase);
  return { db, user };
}
