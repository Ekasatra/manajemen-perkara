/**
 * GET  /api/v1/cases/[id]/timeline — daftar entri timeline (Agent D · D4)
 * POST /api/v1/cases/[id]/timeline — tambah entri timeline manual
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  listTimeline,
  addTimelineEntry,
} from '@ekasatra/core';
import { createTimelineSchema } from '@ekasatra/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'timeline');

    const rows = await listTimeline(db, user, id);
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
    ensureCan(user, 'C', 'timeline');

    const body = await parseBody(req, createTimelineSchema);
    const row = await addTimelineEntry(db, user, id, body);
    return ok(row);
  });
}
