/**
 * GET  /api/v1/notifications — daftar notifikasi personal + hitungan belum dibaca (R8)
 * POST /api/v1/notifications — tandai satu (`{ id }`) atau semua (`{ all: true }`) dibaca
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  requireUser,
  parseBody,
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from '@ekasatra/core';
import { markNotificationsReadSchema } from '@ekasatra/shared';

export async function GET() {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const feed = await getNotificationsForUser(db, {
      userId: user.userId,
      role: user.role,
    });
    return ok(feed);
  });
}

export async function POST(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);

    const body = await parseBody(req, markNotificationsReadSchema);
    const target = { userId: user.userId, role: user.role };

    return ok(
      body.all ? await markAllNotificationsRead(db, target) : await markNotificationRead(db, target, body.id as string),
    );
  });
}
