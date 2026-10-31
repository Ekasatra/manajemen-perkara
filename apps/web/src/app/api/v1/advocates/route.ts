/**
 * GET /api/v1/advocates?kind=Advokat|Paralegal — daftar advokat/paralegal (Agent C · C5)
 *   Admin: semua; non-Admin: hanya milik sendiri.
 * Tidak ada POST: baris dibuat otomatis (trigger DB) saat akun Advokat/Paralegal dibuat
 * di Manajemen User, supaya Admin tidak mengisi dua kali.
 */
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { createDb, advocates } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, ensureCan, can } from '@ekasatra/core';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'advocates');

    const url = new URL(req.url);
    const params: SearchParams = Object.fromEntries(url.searchParams.entries());
    const { page, pageSize, offset } = parsePageQuery(params);

    // Non-Admin hanya melihat milik sendiri.
    const isAdmin = can(user, 'C', 'advocates');
    const conds: SQL[] = [];
    const kind = params.kind;
    if (kind === 'Advokat' || kind === 'Paralegal') conds.push(eq(advocates.kind, kind));
    if (!isAdmin) conds.push(eq(advocates.userId, user.userId));
    const where = conds.length ? and(...conds) : undefined;

    const baseQuery = db
      .select({
        id: advocates.id,
        userId: advocates.userId,
        kind: advocates.kind,
        isActive: advocates.isActive,
        isComplete: advocates.isComplete,
        fullName: advocates.fullName,
        phone: advocates.phone,
        licenseNumber: advocates.licenseNumber,
        education: advocates.education,
        createdAt: advocates.createdAt,
      })
      .from(advocates);

    const [rows, countRows] = await Promise.all([
      where
        ? baseQuery.where(where).orderBy(desc(advocates.createdAt)).limit(pageSize).offset(offset)
        : baseQuery.orderBy(desc(advocates.createdAt)).limit(pageSize).offset(offset),
      where
        ? db.select({ value: count() }).from(advocates).where(where)
        : db.select({ value: count() }).from(advocates),
    ]);

    const total = countRows[0]?.value ?? 0;

    return ok({ rows, page, pageSize, total });
  });
}
