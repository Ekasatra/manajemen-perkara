/**
 * PATCH /api/v1/auth/profile — ubah nama dan preferensi email milik sendiri.
 * Hanya baris profil pengguna yang sedang masuk; role/email/status tidak bisa diubah di sini.
 */
import { eq } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, parseBody, requireUser, logActivity } from '@ekasatra/core';
import { updateProfileSchema } from '@ekasatra/shared';

export async function PATCH(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    const body = await parseBody(req, updateProfileSchema);

    await db
      .update(profiles)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(profiles.id, user.userId));

    await logActivity(db, {
      userId: user.userId,
      userName: body.fullName ?? user.fullName,
      action: 'update_profile',
      module: 'users',
      entityType: 'user',
      entityId: user.userId,
      description: `Memperbarui profil sendiri (${Object.keys(body).join(', ')})`,
    });
    return ok({ success: true });
  });
}
