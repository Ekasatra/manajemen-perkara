/**
 * GET  /api/v1/opponents — daftar pihak lawan (Admin only) (Agent C · C4)
 * POST /api/v1/opponents — buat pihak lawan
 */
import { count, desc } from 'drizzle-orm';
import { createDb, opponents } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  logActivity,
} from '@ekasatra/core';
import { createOpponentSchema } from '@ekasatra/shared';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'opponents');

    const url = new URL(req.url);
    const params: SearchParams = Object.fromEntries(url.searchParams.entries());
    const { page, pageSize, offset } = parsePageQuery(params);

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: opponents.id,
          name: opponents.name,
          type: opponents.type,
          contacts: opponents.contacts,
          address: opponents.address,
          createdAt: opponents.createdAt,
        })
        .from(opponents)
        .orderBy(desc(opponents.createdAt))
        .limit(pageSize)
        .offset(offset),
      db.select({ value: count() }).from(opponents),
    ]);

    const total = countRows[0]?.value ?? 0;

    return ok({ rows, page, pageSize, total });
  });
}

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'C', 'opponents');

    const body = await parseBody(req, createOpponentSchema);

    const [opponent] = await db
      .insert(opponents)
      .values({
        name: body.name,
        type: body.type ?? null,
        contacts: body.contacts,
        address: body.address ?? null,
        notes: body.notes ?? null,
        createdBy: user.userId,
      })
      .returning();

    if (!opponent) throw new Error('Gagal membuat pihak lawan');

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: 'opponents',
      entityType: 'opponent',
      entityId: opponent.id,
      description: `Buat pihak lawan ${opponent.name}`,
    });

    return ok(opponent);
  });
}

