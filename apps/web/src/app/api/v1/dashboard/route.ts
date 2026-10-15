/**
 * GET /api/v1/dashboard — Agregasi data dashboard (PRD §5.10 & G1, G6)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, getDashboardData } from '@ekasatra/core';

export async function GET() {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const data = await getDashboardData(db, user);
    return ok(data);
  });
}

