/**
 * GET  /api/v1/cases/[id]/schedules — daftar jadwal (Agent D · D4)
 * POST /api/v1/cases/[id]/schedules — buat jadwal (jenis default Sidang, status default Terjadwal)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  listSchedules,
  createSchedule,
} from '@ekasatra/core';
import { createScheduleSchema } from '@ekasatra/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'schedules');

    const rows = await listSchedules(db, user, id);
    return ok(rows);
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'C', 'schedules');

    const body = await parseBody(req, createScheduleSchema);
    const row = await createSchedule(db, user, id, body);
    return ok(row);
  });
}
