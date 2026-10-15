/**
 * DELETE /api/v1/cases/[id]/members/[userId]?peran=Advokat — hapus anggota tim (Agent D · D2)
 * Hanya Admin (PRD §5.4). Parameter `peran` wajib karena PK gabungan case_id+user_id+peran.
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  ensureCan,
  removeMember,
} from '@ekasatra/core';
import { badRequest } from '@ekasatra/shared';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  return runRoute(async () => {
    const { id, userId } = await params;
    const url = new URL(req.url);
    const peran = url.searchParams.get('peran');
    if (!peran) throw badRequest('Parameter `peran` wajib (Advokat/Paralegal/Manager)');

    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'D', 'users');

    await removeMember(db, user, id, userId, peran);
    return ok({ success: true });
  });
}
