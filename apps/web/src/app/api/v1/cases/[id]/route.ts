/**
 * GET    /api/v1/cases/[id] — detail perkara (Agent D · D1/D5)
 * PATCH  /api/v1/cases/[id] — update perkara
 * DELETE /api/v1/cases/[id] — hapus perkara (ditolak bila ada invoice/surat RESTRICT)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  getCaseDetail,
  updateCase,
  deleteCase,
} from '@ekasatra/core';
import { updateCaseSchema } from '@ekasatra/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'cases');

    const detail = await getCaseDetail(db, user, id);
    return ok(detail);
  });
}

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

    const body = await parseBody(req, updateCaseSchema);
    const updated = await updateCase(db, user, id, body);
    return ok(updated);
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'D', 'cases');

    await deleteCase(db, user, id);
    return ok({ success: true });
  });
}
