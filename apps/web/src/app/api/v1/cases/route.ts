/**
 * GET  /api/v1/cases — daftar perkara terlihat user (paginasi server) (Agent D · D1)
 * POST /api/v1/cases — buat perkara (REG/{tahun}/ otomatis + advokat pembuat auto-join tim)
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  createCase,
  listCases,
} from '@ekasatra/core';
import { createCaseSchema } from '@ekasatra/shared';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'cases');

    const url = new URL(req.url);
    const params: SearchParams = Object.fromEntries(url.searchParams.entries());
    const { page, pageSize, offset } = parsePageQuery(params);
    const q = url.searchParams.get('q') ?? undefined;

    const { rows, total } = await listCases(db, user, { page, pageSize, offset, q });

    return ok({ rows, page, pageSize, total });
  });
}

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'C', 'cases');

    const body = await parseBody(req, createCaseSchema);
    const caseRow = await createCase(db, user, body);

    return ok(caseRow);
  });
}
