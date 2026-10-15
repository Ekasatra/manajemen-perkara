/**
 * GET   /api/v1/settings — baca semua settings (Agent C · C6)
 * PATCH /api/v1/settings — update settings (Admin only)
 */
import { sql } from 'drizzle-orm';
import { createDb, settings } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  ok,
  runRoute,
  parseBody,
  requireUser,
  ensureCan,
  logActivity,
} from '@ekasatra/core';
import { updateSettingsSchema } from '@ekasatra/shared';

export async function GET() {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'settings');

    const rows = await db.select().from(settings);
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }

    return ok(result);
  });
}

export async function PATCH(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'U', 'settings');

    const body = await parseBody(req, updateSettingsSchema);

    // Upsert setiap key yang diubah.
    const changedKeys: string[] = [];
    for (const [key, value] of Object.entries(body)) {
      await db
        .insert(settings)
        .values({
          key,
          value: sql`${JSON.stringify(value)}::jsonb`,
          updatedBy: user.userId,
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: sql`${JSON.stringify(value)}::jsonb`,
            updatedBy: user.userId,
            updatedAt: new Date(),
          },
        });
      changedKeys.push(key);
    }

    await logActivity(db, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: 'settings',
      entityType: 'settings',
      entityId: null,
      description: `Update pengaturan: ${changedKeys.join(', ')}`,
    });

    return ok({ updated: changedKeys });
  });
}
