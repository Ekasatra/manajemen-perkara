/**
 * PATCH /api/v1/cases/[id]/status — ubah status perkara (Agent D · D3)
 * PRD §5.4: otomatis set putus_date, upaya_deadline, closed_date + entri timeline.
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  changeCaseStatus,
} from '@ekasatra/core';
import { changeCaseStatusSchema } from '@ekasatra/shared';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'cases');

    const { status, reason } = await parseBody(req, changeCaseStatusSchema);
    const updated = await changeCaseStatus(db, user, id, status, reason);
    return ok(updated);
  });
}
