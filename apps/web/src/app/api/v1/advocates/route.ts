/**
 * GET  /api/v1/advocates — daftar advokat (Agent C · C5)
 *   Admin: semua; non-Admin: hanya milik sendiri.
 * POST /api/v1/advocates — buat data advokat (R7: hanya SuperAdmin/Admin).
 * PRD §5.3: wajib nama, alamat, telepon, rekening, pendidikan min 1.
 */
import { count, desc, eq } from 'drizzle-orm';
import { createDb, advocates } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  can,
  logActivity,
} from '@ekasatra/core';
import { conflict } from '@ekasatra/shared';
import { createAdvocateSchema } from '@ekasatra/shared';
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
    const where = isAdmin ? undefined : eq(advocates.userId, user.userId);

    const baseQuery = db
      .select({
        id: advocates.id,
        userId: advocates.userId,
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

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    // R7: tambah data advokat hanya SuperAdmin/Admin.
    ensureCan(user, 'C', 'advocates');

    const body = await parseBody(req, createAdvocateSchema);

    const targetUserId = body.userId ?? null;

    // Cek userId unik (satu akun = satu data advokat).
    if (targetUserId) {
      const [existing] = await db
        .select({ id: advocates.id })
        .from(advocates)
        .where(eq(advocates.userId, targetUserId))
        .limit(1);
      if (existing) throw conflict('User ini sudah memiliki data advokat');
    }

    const [advocate] = await db
      .insert(advocates)
      .values({
        userId: targetUserId,
        fullName: body.fullName,
        address: body.address,
        phone: body.phone,
        bankName: body.bankName ?? null,
        bankAccount: body.bankAccount,
        licenseNumber: body.licenseNumber ?? null,
        education: body.education,
        trainings: body.trainings,
      })
      .returning();

    if (!advocate) throw new Error('Gagal membuat data advokat');

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: 'advocates',
      entityType: 'advocate',
      entityId: advocate.id,
      description: `Buat data advokat ${advocate.fullName}`,
    });

    return ok(advocate);
  });
}
