import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { activityLogs } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import type { DashboardActivityItem } from '@ekasatra/shared';
import { logActivity } from '../kernel/activity';

/**
 * 10 aktivitas terbaru untuk dashboard (PRD §5.10).
 */
export async function getRecentActivitiesForDashboard(
  db: DbExecutor,
  limit: number = 10,
): Promise<DashboardActivityItem[]> {
  const rows = await db
    .select({
      id: activityLogs.id,
      userName: activityLogs.userName,
      action: activityLogs.action,
      module: activityLogs.module,
      description: activityLogs.description,
      createdAt: sql<string>`cast(${activityLogs.createdAt} as text)`,
    })
    .from(activityLogs)
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit);

  return rows;
}

/**
 * Cek apakah cron pengingat sudah pernah dijalankan hari ini (G5: Idempoten per hari).
 * Memeriksa log aktivitas untuk aksi `cron_reminders_run` pada rentang hari ini (WIB).
 */
export async function isCronRemindersAlreadyRunToday(
  db: DbExecutor,
  todayWibStr: string,
): Promise<boolean> {
  const startOfDay = new Date(`${todayWibStr}T00:00:00+07:00`);
  const endOfDay = new Date(`${todayWibStr}T23:59:59+07:00`);

  const rows = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.action, 'cron_reminders_run'),
        eq(activityLogs.module, 'notifications'),
        gte(activityLogs.createdAt, startOfDay),
        lte(activityLogs.createdAt, endOfDay),
      ),
    );

  return (rows[0]?.count ?? 0) > 0;
}

/**
 * Catat jalannya cron pengingat ke activity log untuk menjamin idempotensi.
 */
export async function recordCronRemindersRun(
  db: DbExecutor,
  data: { todayWibStr: string; sidangCount: number; upayaCount: number },
): Promise<void> {
  await logActivity(db, {
    userName: 'Vercel Cron System',
    action: 'cron_reminders_run',
    module: 'notifications',
    description: `Eksekusi pengingat harian: ${data.sidangCount} jadwal sidang, ${data.upayaCount} batas upaya hukum`,
    metadata: data,
  });
}

