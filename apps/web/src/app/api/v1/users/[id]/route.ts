/**
 * GET    /api/v1/users/[id] — detail user (Admin only) (Agent C · C2)
 * PATCH  /api/v1/users/[id] — update user (Admin only, tidak boleh ubah role/nonaktif diri sendiri)
 * DELETE /api/v1/users/[id] — hapus user (Admin only, tidak boleh hapus diri sendiri)
 */
import { eq } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, parseBody, requireUser, ensureCan, logActivity, normalizeRole } from '@ekasatra/core';
import { notFound, badRequest, forbidden } from '@ekasatra/shared';
import { updateUserSchema } from '@ekasatra/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'users');

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!profile) throw notFound('User tidak ditemukan');

    return ok(profile);
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
    ensureCan(user, 'U', 'users');

    const body = await parseBody(req, updateUserSchema);

    // Tidak boleh ubah role / nonaktifkan diri sendiri (PRD §5.1).
    if (id === user.userId) {
      if (body.role !== undefined && normalizeRole(body.role) !== user.role) {
        throw forbidden('Tidak boleh mengubah role sendiri');
      }
      if (body.isActive === false) {
        throw forbidden('Tidak boleh menonaktifkan akun sendiri');
      }
    }

    const [existing] = await db
      .select({ id: profiles.id, role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!existing) throw notFound('User tidak ditemukan');
    // Akun Superadmin hanya boleh diubah oleh Superadmin sendiri.
    if (existing.role === 'SuperAdmin' && user.role !== 'superadmin') {
      throw forbidden('Akun Superadmin tidak dapat diubah');
    }

    const [updated] = await db
      .update(profiles)
      .set(body)
      .where(eq(profiles.id, id))
      .returning();

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'users',
      entityType: 'user',
      entityId: id,
      description: `Update user ${updated?.fullName ?? id}`,
    });

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
    ensureCan(user, 'D', 'users');

    // Tidak boleh hapus diri sendiri.
    if (id === user.userId) {
      throw badRequest('Tidak boleh menghapus akun sendiri');
    }

    const [target] = await db
      .select({ fullName: profiles.fullName, email: profiles.email, role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!target) throw notFound('User tidak ditemukan');
    if (target.role === 'SuperAdmin') throw forbidden('Akun Superadmin tidak dapat dihapus');

    // Hapus dari Supabase Auth → cascade hapus profil.
    const supabaseService = createSupabaseServiceClient();
    const { error } = await supabaseService.auth.admin.deleteUser(id);
    if (error) throw badRequest(`Gagal menghapus user: ${error.message}`);

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'users',
      entityType: 'user',
      entityId: id,
      description: `Hapus user ${target.fullName} (${target.email})`,
    });

    return ok({ success: true });
  });
}
