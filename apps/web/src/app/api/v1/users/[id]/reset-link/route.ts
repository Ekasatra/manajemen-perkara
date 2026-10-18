/**
 * POST /api/v1/users/[id]/reset-link — Admin kirim link reset password ke email user (W4 R1).
 * Link sekali pakai, kedaluwarsa ≤ 1 jam. Email tersamar di response.
 */
import { eq } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  ensureCan,
  logActivity,
  normalizeRole,
  sendResetLink,
} from '@ekasatra/core';
import { badRequest, notFound, forbidden } from '@ekasatra/shared';

export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'users');

    const [target] = await db
      .select({ fullName: profiles.fullName, email: profiles.email, role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!target) throw notFound('User tidak ditemukan');

    // Admin tidak boleh mereset SuperAdmin (R1).
    if (target.role === 'SuperAdmin' && normalizeRole(user.role) !== 'superadmin') {
      throw forbidden('Akun Superadmin tidak dapat direset oleh Admin');
    }

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const result = await sendResetLink(db, id, appUrl);

    if (!result.ok) {
      // Detail Supabase/SMTP hanya ke log server, alamat email disamarkan.
      if (result.detail) {
        console.error(
          `[users] reset-link gagal untuk user ${id}:`,
          result.detail.replace(/[^\s@<>"']+@[^\s@<>"']+/g, '[email]'),
        );
      }
      throw badRequest(result.error ?? 'Gagal mengirim link reset');
    }

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'reset_link_sent',
      module: 'users',
      entityType: 'user',
      entityId: id,
      description: `Mengirim link reset password ke ${result.maskedEmail ?? target.email}`,
    });

    return ok({ success: true, maskedEmail: result.maskedEmail });
  });
}