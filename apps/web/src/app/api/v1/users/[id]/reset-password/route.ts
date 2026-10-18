/**
 * POST /api/v1/users/[id]/reset-password — Admin reset password user (Agent C · C2).
 */
import { eq } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServiceClient } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  ensureCanManageUser,
  logActivity,
} from '@ekasatra/core';
import { notFound } from '@ekasatra/shared';
import { resetPasswordSchema } from '@ekasatra/shared';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'users');

    const body = await parseBody(req, resetPasswordSchema);

    const [target] = await db
      .select({ fullName: profiles.fullName, email: profiles.email, role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, id))
      .limit(1);
    if (!target) throw notFound('User tidak ditemukan');
    ensureCanManageUser(user, target.role);

    const supabaseService = createSupabaseServiceClient();
    const { error } = await supabaseService.auth.admin.updateUserById(id, {
      password: body.password,
    });
    if (error) throw notFound(`Gagal reset password: ${error.message}`);

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'reset_password',
      module: 'users',
      entityType: 'user',
      entityId: id,
      description: `Reset password user ${target.fullName} (${target.email})`,
    });

    return ok({ success: true });
  });
}
