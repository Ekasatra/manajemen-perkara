/**
 * POST /api/v1/clients/[id]/regenerate-token — buat ulang token portal (Agent C · C3).
 */
import { eq } from 'drizzle-orm';
import { createDb, clients } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  ensureCan,
  logActivity,
} from '@ekasatra/core';
import { notFound } from '@ekasatra/shared';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return runRoute(async () => {
    const { id } = await params;
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'clients');

    const [target] = await db
      .select({ name: clients.name })
      .from(clients)
      .where(eq(clients.id, id))
      .limit(1);
    if (!target) throw notFound('Klien tidak ditemukan');

    // Token acak 64 hex (2× uuid v4 tanpa dash).
    const newToken = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');

    await db.update(clients).set({ portalToken: newToken }).where(eq(clients.id, id));

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'regenerate_token',
      module: 'clients',
      entityType: 'client',
      entityId: id,
      description: `Buat ulang token portal klien ${target.name}`,
    });

    return ok({ portalToken: newToken });
  });
}
