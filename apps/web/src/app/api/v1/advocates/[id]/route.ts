/**
 * GET    /api/v1/advocates/[id] — detail advokat (Agent C · C5)
 * PATCH  /api/v1/advocates/[id] — update advokat/paralegal (nama ikut mengubah nama akun lewat trigger)
 * DELETE /api/v1/advocates/[id] — hapus advokat (SuperAdmin; hanya baris nonaktif / tanpa akun)
 */
import { eq } from 'drizzle-orm';
import { createDb, advocates } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, parseBody, requireUser, ensureCan, can, logActivity } from '@ekasatra/core';
import { badRequest, forbidden, notFound } from '@ekasatra/shared';
import { updateAdvocateSchema } from '@ekasatra/shared';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'advocates');

    const [advocate] = await db.select().from(advocates).where(eq(advocates.id, id)).limit(1);
    if (!advocate) throw notFound('Data advokat tidak ditemukan');

    // Non-Admin hanya boleh melihat milik sendiri.
    if (!can(user, 'C', 'advocates') && advocate.userId !== user.userId) {
      throw forbidden('Tidak boleh melihat data advokat lain');
    }

    return ok(advocate);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'advocates');

    const body = await parseBody(req, updateAdvocateSchema);

    const [existing] = await db.select().from(advocates).where(eq(advocates.id, id)).limit(1);
    if (!existing) throw notFound('Data advokat tidak ditemukan');

    // Non-Admin hanya boleh update milik sendiri.
    if (!can(user, 'C', 'advocates') && existing.userId !== user.userId) {
      throw forbidden('Tidak boleh mengubah data advokat lain');
    }

    const [updated] = await db.update(advocates).set(body).where(eq(advocates.id, id)).returning();

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'advocates',
      entityType: 'advocate',
      entityId: id,
      description: `Update data advokat ${updated?.fullName ?? id}`,
    });

    return ok(updated);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'D', 'advocates'); // Admin only.

    const [target] = await db
      .select({
        fullName: advocates.fullName,
        userId: advocates.userId,
        isActive: advocates.isActive,
      })
      .from(advocates)
      .where(eq(advocates.id, id))
      .limit(1);
    if (!target) throw notFound('Data advokat tidak ditemukan');
    // Baris milik akun aktif dikelola lewat Manajemen User (nonaktifkan/hapus akun), bukan dihapus di sini.
    if (target.userId && target.isActive) {
      throw badRequest(
        'Data ini milik akun yang masih aktif. Nonaktifkan atau hapus akunnya di Manajemen User.',
      );
    }

    await db.delete(advocates).where(eq(advocates.id, id));

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'advocates',
      entityType: 'advocate',
      entityId: id,
      description: `Hapus data advokat ${target.fullName}`,
    });

    return ok({ success: true });
  });
}
