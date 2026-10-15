/**
 * Halaman Audit Log (Agent C · C7).
 * Admin only. Filter by module, action, date range.
 */
import { count, desc, eq, and, gte, lte, type SQL } from 'drizzle-orm';
import { createDb, activityLogs } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDateTime } from '@/lib/format';
import { AuditFilter } from '@/modules/audit/audit-filter';

type AuditRow = {
  id: number;
  userId: string | null;
  userName: string | null;
  action: string;
  module: string;
  entityType: string | null;
  entityId: string | null;
  description: string | null;
  createdAt: Date;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'audit_log');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);

  const moduleName = typeof params.module === 'string' ? params.module : undefined;
  const action = typeof params.action === 'string' ? params.action : undefined;
  const fromDate = typeof params.fromDate === 'string' ? params.fromDate : undefined;
  const toDate = typeof params.toDate === 'string' ? params.toDate : undefined;

  const conditions: SQL[] = [];
  if (moduleName) conditions.push(eq(activityLogs.module, moduleName));
  if (action) conditions.push(eq(activityLogs.action, action));
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

  const columns: Column<AuditRow>[] = [
    { key: 'createdAt', header: 'Waktu', cell: (r) => formatDateTime(r.createdAt) },
    { key: 'userName', header: 'User', cell: (r) => r.userName ?? '-' },
    { key: 'action', header: 'Aksi', cell: (r) => r.action },
    { key: 'module', header: 'Modul', cell: (r) => r.module },
    { key: 'description', header: 'Deskripsi', cell: (r) => r.description ?? '-' },
  ];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-navy-700">Audit Log</h1>
      <AuditFilter initialParams={params} />
      <div className="mt-4">
        <DataTable<AuditRow>
          caption="Daftar audit log"
          columns={columns}
          rows={rows}
          rowKey={(r) => String(r.id)}
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/audit"
          searchParams={params}
          empty={{
            title: 'Tidak ada log',
            hint: 'Belum ada aktivitas yang tercatat untuk filter ini.',
          }}
        />
      </div>
    </div>
  );
}
