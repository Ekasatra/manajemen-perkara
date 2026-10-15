/**
 * GET    /api/v1/opponents/[id] — detail pihak lawan (Agent C · C4)
 * PATCH  /api/v1/opponents/[id] — update pihak lawan
 * DELETE /api/v1/opponents/[id] — hapus pihak lawan
 */
import { eq } from 'drizzle-orm';
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
import { notFound } from '@ekasatra/shared';
import { updateOpponentSchema } from '@ekasatra/shared';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'opponents');

    const [opponent] = await db
      .select()
      .from(opponents)
      .where(eq(opponents.id, id))
      .limit(1);
    if (!opponent) throw notFound('Pihak lawan tidak ditemukan');

    return ok(opponent);
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
    ensureCan(user, 'U', 'opponents');

    const body = await parseBody(req, updateOpponentSchema);

    const [updated] = await db
      .update(opponents)
      .set(body)
      .where(eq(opponents.id, id))
      .returning();
    if (!updated) throw notFound('Pihak lawan tidak ditemukan');

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'opponents',
      entityType: 'opponent',
      entityId: id,
      description: `Update pihak lawan ${updated.name}`,
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
    ensureCan(user, 'D', 'opponents');

    const [target] = await db
      .select({ name: opponents.name })
      .from(opponents)
      .where(eq(opponents.id, id))
      .limit(1);
    if (!target) throw notFound('Pihak lawan tidak ditemukan');

    await db.delete(opponents).where(eq(opponents.id, id));

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: 'opponents',
      entityType: 'opponent',
      entityId: id,
      description: `Hapus pihak lawan ${target.name}`,
    });

    return ok({ success: true });
  });
}
