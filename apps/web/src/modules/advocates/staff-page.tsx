/**
 * Daftar Data Advokat / Data Paralegal (satu tabel `advocates`, dibedakan `kind`).
 * Baris dibuat otomatis (trigger DB) saat Admin membuat akun di Manajemen User — tidak ada
 * tombol "Tambah" di sini. R7: tambah/ubah/hapus hanya SuperAdmin/Admin; non-Admin hanya barisnya sendiri.
 */
import { and, count, desc, eq, type SQL } from 'drizzle-orm';
import { createDb, advocates, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can } from '@ekasatra/core';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { AdvocateActions } from '@/modules/advocates/advocate-actions';
import { AdvocateDetailDialog } from '@/modules/advocates/advocate-detail-dialog';

export type StaffKind = 'Advokat' | 'Paralegal';

/** Pendidikan terakhir = entri paling akhir dalam daftar pendidikan. */
function latestEducation(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '—';
  const e = value[value.length - 1] as { level?: string; institution?: string };
  return [e.level, e.institution].filter(Boolean).join(' · ') || '—';
}

type StaffRow = {
  id: string;
  userId: string | null;
  kind: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  bankName: string | null;
  bankAccount: string | null;
  licenseNumber: string | null;
  education: unknown;
  trainings: unknown;
  isActive: boolean;
  isComplete: boolean | null;
  createdAt: Date;
};

export async function StaffPage({
  kind,
  searchParams,
}: {
  kind: StaffKind;
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'advocates');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  const isAdmin = can(user, 'C', 'advocates');

  const conds: SQL[] = [eq(advocates.kind, kind)];
  if (!isAdmin) conds.push(eq(advocates.userId, user.userId));
  const where = and(...conds);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: advocates.id,
        userId: advocates.userId,
        kind: advocates.kind,
        fullName: advocates.fullName,
        email: profiles.email,
        phone: advocates.phone,
        address: advocates.address,
        bankName: advocates.bankName,
        bankAccount: advocates.bankAccount,
        licenseNumber: advocates.licenseNumber,
        education: advocates.education,
        trainings: advocates.trainings,
        isActive: advocates.isActive,
        isComplete: advocates.isComplete,
        createdAt: advocates.createdAt,
      })
      .from(advocates)
      .leftJoin(profiles, eq(profiles.id, advocates.userId))
      .where(where)
      .orderBy(desc(advocates.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(advocates).where(where),
  ]);

  const total = countRows[0]?.value ?? 0;
  const canEdit = can(user, 'U', 'advocates');
  const canDelete = can(user, 'D', 'advocates');
  const label = `Data ${kind}`;

  const columns: Column<StaffRow>[] = [
    {
      key: 'fullName',
      header: kind,
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.fullName} size={9} />
          <div>
            <AdvocateDetailDialog advocate={r} />
            <div className="text-xs text-navy-400">
              {r.email ?? (r.userId ? 'Terhubung ke akun pengguna' : 'Belum terhubung ke akun')}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Kontak', cell: (r) => r.phone || '—' },
    { key: 'edu', header: 'Pendidikan Terakhir', cell: (r) => latestEducation(r.education) },
    ...(kind === 'Advokat'
      ? [
          {
            key: 'licenseNumber',
            header: 'No. KTA',
            cell: (r: StaffRow) =>
              r.licenseNumber ? (
                <Badge tone="neutral">{r.licenseNumber}</Badge>
              ) : (
                <span className="text-navy-300">—</span>
              ),
          },
        ]
      : []),
    {
      key: 'status',
      header: 'Status Data',
      cell: (r) =>
        !r.isActive ? (
          <Badge tone="neutral">Nonaktif</Badge>
        ) : r.isComplete ? (
          <Badge tone="success">Lengkap</Badge>
        ) : (
          <Badge tone="warning">Belum lengkap</Badge>
        ),
    },
    ...(canEdit || canDelete
      ? [
          {
            key: 'aksi',
            header: '',
            cell: (r: StaffRow) => (
              <AdvocateActions
                row={r}
                canEdit={canEdit}
                canDelete={canDelete && (!r.isActive || !r.userId)}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title={isAdmin ? label : 'Data Diri Saya'} />
      <DataTable<StaffRow>
        caption={`Daftar ${label.toLowerCase()}`}
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath={kind === 'Advokat' ? '/advocates' : '/paralegals'}
        searchParams={params}
        empty={{
          title: `Belum ada ${label.toLowerCase()}`,
          hint: isAdmin
            ? `Data muncul otomatis saat akun role ${kind} dibuat di Manajemen User.`
            : 'Hubungi Admin bila data Anda belum tersedia.',
        }}
      />
    </div>
  );
}
