/**
 * GET /api/v1/audit — daftar audit log dengan filter (Agent C · C7).
 * Admin only. Filter: module, action, userId, entityType, entityId, date range.
 */
import { count, desc, eq, and, gte, lte, type SQL } from 'drizzle-orm';
import { createDb, activityLogs } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { ok, runRoute, requireUser, ensureCan } from '@ekasatra/core';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';

export async function GET(req: Request) {
  return runRoute(async () => {
    const db = createDb();
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(db, supabase);
    ensureCan(user, 'R', 'audit_log');

    const url = new URL(req.url);
    const params: SearchParams = Object.fromEntries(url.searchParams.entries());
    const { page, pageSize, offset } = parsePageQuery(params);

    const moduleName = url.searchParams.get('module') || undefined;
    const action = url.searchParams.get('action') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const entityType = url.searchParams.get('entityType') || undefined;
    const fromDate = url.searchParams.get('fromDate') || undefined;
    const toDate = url.searchParams.get('toDate') || undefined;

    const conditions: SQL[] = [];
    if (moduleName) conditions.push(eq(activityLogs.module, moduleName));
    if (action) conditions.push(eq(activityLogs.action, action));
    if (userId) conditions.push(eq(activityLogs.userId, userId));
    if (entityType) conditions.push(eq(activityLogs.entityType, entityType));
    if (fromDate) conditions.push(gte(activityLogs.createdAt, new Date(fromDate)));
    if (toDate) conditions.push(lte(activityLogs.createdAt, new Date(`${toDate}T23:59:59`)));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const baseQuery = db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        userName: activityLogs.userName,
        action: activityLogs.action,
        module: activityLogs.module,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        description: activityLogs.description,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs);

    const [rows, countRows] = await Promise.all([
      where
        ? baseQuery.where(where).orderBy(desc(activityLogs.createdAt)).limit(pageSize).offset(offset)
        : baseQuery.orderBy(desc(activityLogs.createdAt)).limit(pageSize).offset(offset),
      where
        ? db.select({ value: count() }).from(activityLogs).where(where)
        : db.select({ value: count() }).from(activityLogs),
    ]);

    const total = countRows[0]?.value ?? 0;

    return ok({ rows, page, pageSize, total });
  });
}
