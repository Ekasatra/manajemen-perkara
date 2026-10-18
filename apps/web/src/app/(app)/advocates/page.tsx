/**
 * Halaman daftar Data Advokat (Agent C · C5).
 * R7: semua peran boleh lihat; non-Admin hanya barisnya sendiri.
 * Tambah/ubah/hapus hanya SuperAdmin/Admin (lewat `can('C'|'U'|'D','advocates')`).
 */
import { count, desc, eq } from 'drizzle-orm';
import { createDb, advocates } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can } from '@ekasatra/core';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { CreateAdvocateDialog } from '@/modules/advocates/create-advocate-dialog';
import { AdvocateActions } from '@/modules/advocates/advocate-actions';
import { AdvocateDetailDialog } from '@/modules/advocates/advocate-detail-dialog';

/** Pendidikan terakhir = entri paling akhir dalam daftar pendidikan. */
function latestEducation(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) return '—';
  const e = value[value.length - 1] as { level?: string; institution?: string };
  return [e.level, e.institution].filter(Boolean).join(' · ') || '—';
}

type AdvocateRow = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string;
  address: string;
  bankName: string | null;
  bankAccount: string;
  licenseNumber: string | null;
  education: unknown;
  trainings: unknown;
  createdAt: Date;
};

export default async function AdvocatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'advocates');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  // R7: tambah/ubah/hapus hanya SuperAdmin/Admin; non-Admin tetap boleh lihat barisnya sendiri.
  const isAdmin = can(user, 'C', 'advocates');

  const where = isAdmin ? undefined : eq(advocates.userId, user.userId);

  const baseQuery = db
    .select({
      id: advocates.id,
      userId: advocates.userId,
      fullName: advocates.fullName,
      phone: advocates.phone,
      address: advocates.address,
      bankName: advocates.bankName,
      bankAccount: advocates.bankAccount,
      licenseNumber: advocates.licenseNumber,
      education: advocates.education,
      trainings: advocates.trainings,
      createdAt: advocates.createdAt,
    })
    .from(advocates);

  const [rows, countRows] = await Promise.all([
    where
      ? baseQuery.where(where).orderBy(desc(advocates.createdAt)).limit(pageSize).offset(offset)
      : baseQuery.orderBy(desc(advocates.createdAt)).limit(pageSize).offset(offset),
    where
      ? db.select({ value: count() }).from(advocates).where(where)
      : db.select({ value: count() }).from(advocates),
  ]);

  const total = countRows[0]?.value ?? 0;
  const canEdit = can(user, 'U', 'advocates');
  const canDelete = can(user, 'D', 'advocates');

  const columns: Column<AdvocateRow>[] = [
    {
      key: 'fullName',
      header: 'Advokat',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.fullName} size={9} />
          <div>
            <AdvocateDetailDialog advocate={r} />
            <div className="text-xs text-navy-400">
              {r.userId ? 'Terhubung ke akun pengguna' : 'Belum terhubung ke akun'}
            </div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Kontak', cell: (r) => r.phone },
    { key: 'edu', header: 'Pendidikan Terakhir', cell: (r) => latestEducation(r.education) },
    {
      key: 'licenseNumber',
      header: 'No. KTA',
      cell: (r) =>
        r.licenseNumber ? (
          <Badge tone="neutral">{r.licenseNumber}</Badge>
        ) : (
          <span className="text-navy-300">—</span>
        ),
    },
    ...(canEdit || canDelete
      ? [
          {
            key: 'aksi',
            header: '',
            cell: (r: AdvocateRow) => (
              <AdvocateActions row={r} canEdit={canEdit} canDelete={canDelete} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Data Advokat' : 'Data Diri Saya'}
        actions={isAdmin ? <CreateAdvocateDialog /> : null}
      />
      <DataTable<AdvocateRow>
        caption="Daftar data advokat"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/advocates"
        searchParams={params}
        empty={{
          title: 'Belum ada data advokat',
          hint: isAdmin ? 'Tambahkan data advokat untuk staf.' : 'Lengkapi data advokat Anda.',
          action: isAdmin ? <CreateAdvocateDialog /> : undefined,
        }}
      />
    </div>
  );
}
