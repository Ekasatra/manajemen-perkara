/**
 * POST /api/v1/auth/logout — hapus sesi Supabase (Agent C · C1).
 */
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute } from '@ekasatra/core';

export async function POST() {
  return runRoute(async () => {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    return ok({ success: true });
  });
}
