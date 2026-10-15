/**
 * PATCH  /api/v1/cases/[id]/schedules/[schedId] — update jadwal (Agent D · D4)
 * DELETE /api/v1/cases/[id]/schedules/[schedId] — hapus jadwal
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  updateSchedule,
  deleteSchedule,
} from '@ekasatra/core';
import { updateScheduleSchema } from '@ekasatra/shared';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; schedId: string }> },
) {
  return runRoute(async () => {
    const { id, schedId } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'schedules');

    const body = await parseBody(req, updateScheduleSchema);
    const row = await updateSchedule(db, user, id, schedId, body);
    return ok(row);
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; schedId: string }> },
) {
  return runRoute(async () => {
    const { id, schedId } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'D', 'schedules');

    await deleteSchedule(db, user, id, schedId);
    return ok({ success: true });
  });
}
