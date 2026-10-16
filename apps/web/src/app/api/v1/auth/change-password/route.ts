/**
 * POST /api/v1/auth/change-password — ganti password sendiri. Password saat ini diverifikasi
 * lebih dulu lewat signInWithPassword (sesi tetap milik pengguna yang sama), lalu diganti
 * lewat admin API Supabase. Tindakan dicatat di Audit Log tanpa menyimpan password.
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, parseBody, requireUser, logActivity } from '@ekasatra/core';
import { badRequest, changePasswordSchema } from '@ekasatra/shared';

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    const body = await parseBody(req, changePasswordSchema);
    if (body.currentPassword === body.newPassword) {
      throw badRequest('Password baru harus berbeda dari password saat ini');
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: body.currentPassword,
    });
    if (verifyError) throw badRequest('Password saat ini salah');

    const { error } = await createSupabaseServiceClient().auth.admin.updateUserById(user.userId, {
      password: body.newPassword,
    });
    if (error) throw badRequest(`Gagal mengganti password: ${error.message}`);

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'change_password',
      module: 'auth',
      entityType: 'user',
      entityId: user.userId,
      description: 'Mengganti password sendiri',
    });
    return ok({ success: true });
  });
}
