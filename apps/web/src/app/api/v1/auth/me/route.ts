/**
 * GET /api/v1/auth/me — profil user yang sedang login (Agent C · C1).
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser } from '@ekasatra/core';

export async function GET() {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    return ok(user);
  });
}
