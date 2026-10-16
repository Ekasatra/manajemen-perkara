/**
 * Halaman Audit Log (Agent C · C7).
 * Admin only. Filter by module, action, date range.
 */
import { count, desc, eq, and, gte, ilike, lte, type SQL } from 'drizzle-orm';
import { createDb, activityLogs, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDateTime } from '@/lib/format';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';

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

export default async function AuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'audit_log');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);

  const moduleName = typeof params.module === 'string' ? params.module : undefined;
  const action = typeof params.action === 'string' ? params.action : undefined;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const userId = typeof params.user === 'string' ? params.user : '';
  const fromDate = typeof params.dari === 'string' && params.dari ? params.dari : undefined;
  const toDate = typeof params.sampai === 'string' && params.sampai ? params.sampai : undefined;

  const conditions: SQL[] = [];
  if (moduleName) conditions.push(eq(activityLogs.module, moduleName));
  if (action) conditions.push(eq(activityLogs.action, action));
  if (q) conditions.push(ilike(activityLogs.description, `%${q}%`));
  if (userId) conditions.push(eq(activityLogs.userId, userId));
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

  const [rows, countRows, moduleRows, actionRows, userRows] = await Promise.all([
    where
      ? baseQuery.where(where).orderBy(desc(activityLogs.createdAt)).limit(pageSize).offset(offset)
      : baseQuery.orderBy(desc(activityLogs.createdAt)).limit(pageSize).offset(offset),
    where
      ? db.select({ value: count() }).from(activityLogs).where(where)
      : db.select({ value: count() }).from(activityLogs),
    db.selectDistinct({ v: activityLogs.module }).from(activityLogs).orderBy(activityLogs.module),
    db.selectDistinct({ v: activityLogs.action }).from(activityLogs).orderBy(activityLogs.action),
    db
      .select({ id: profiles.id, name: profiles.fullName })
      .from(profiles)
      .orderBy(profiles.fullName),
  ]);

  const total = countRows[0]?.value ?? 0;

  const ACTION_TONE: Record<string, BadgeTone> = {
    create: 'success',
    update: 'info',
    delete: 'danger',
    login: 'neutral',
    logout: 'neutral',
    login_failed: 'orange',
    reject: 'orange',
    sign: 'gold',
  };

  const columns: Column<AuditRow>[] = [
    {
      key: 'createdAt',
      header: 'Waktu',
      cell: (r) => <span className="whitespace-nowrap text-xs">{formatDateTime(r.createdAt)}</span>,
    },
    {
      key: 'userName',
      header: 'User',
      cell: (r) =>
        r.userName ? (
          <span className="flex items-center gap-2 text-sm">
            <Avatar name={r.userName} size={7} /> {r.userName}
          </span>
        ) : (
          <span className="text-sm text-navy-400">Sistem / Klien</span>
        ),
    },
    {
      key: 'action',
      header: 'Aksi',
      cell: (r) => <Badge tone={ACTION_TONE[r.action] ?? 'neutral'}>{r.action}</Badge>,
    },
    { key: 'module', header: 'Modul', cell: (r) => <span className="text-xs">{r.module}</span> },
    { key: 'description', header: 'Deskripsi', cell: (r) => r.description ?? '-' },
    {
      key: 'entity',
      header: 'ID Entitas',
      cell: (r) => (
        <span className="font-mono text-[11px] text-navy-400">
          {(r.entityId ?? '').slice(0, 8)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Log"
      />
      <div className="card-surface mb-4">
        <FilterBar
          q={q}
          placeholder="Cari deskripsi…"
          selects={[
            {
              name: 'user',
              label: 'User',
              all: 'Semua user',
              value: userId,
              options: userRows.map((u) => ({ value: u.id, label: u.name })),
            },
            {
              name: 'module',
              label: 'Modul',
              all: 'Semua modul',
              value: moduleName ?? '',
              options: moduleRows.map((m) => ({ value: m.v, label: m.v })),
            },
            {
              name: 'action',
              label: 'Aksi',
              all: 'Semua aksi',
              value: action ?? '',
              options: actionRows.map((a) => ({ value: a.v, label: a.v })),
            },
          ]}
          dates={{
            from: fromDate ?? '',
            to: toDate ?? '',
            fromLabel: 'Dari tanggal',
            toLabel: 'Sampai tanggal',
          }}
        />
      </div>
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
  );
}
