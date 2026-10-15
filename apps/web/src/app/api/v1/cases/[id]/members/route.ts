/**
 * GET  /api/v1/cases/[id]/members — daftar anggota tim perkara (Agent D · D2)
 * POST /api/v1/cases/[id]/members — tambah anggota (hanya Admin; PRD §5.4)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  listMembers,
  addMember,
} from '@ekasatra/core';
import { createCaseMemberSchema } from '@ekasatra/shared';

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

    const members = await listMembers(db, user, id);
    return ok(members);
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
    // Hanya Admin yang mengatur tim perkara (PRD §5.4).
    ensureCan(user, 'C', 'users');

    const body = await parseBody(req, createCaseMemberSchema);
    await addMember(db, user, id, body);
    return ok({ success: true });
  });
}
