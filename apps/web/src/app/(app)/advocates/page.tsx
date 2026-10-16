/**
 * Halaman daftar Data Advokat (Agent C · C5).
 * Admin: semua; non-Admin: hanya milik sendiri.
 */
import { count, desc, eq } from 'drizzle-orm';
import { createDb, advocates } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { CreateAdvocateDialog } from '@/modules/advocates/create-advocate-dialog';

type AdvocateRow = {
  id: string;
  userId: string | null;
  fullName: string;
  phone: string;
  licenseNumber: string | null;
  education: unknown;
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
  const isAdmin = can(user, 'C', 'advocates');

  const where = isAdmin ? undefined : eq(advocates.userId, user.userId);

  const baseQuery = db
    .select({
      id: advocates.id,
      userId: advocates.userId,
      fullName: advocates.fullName,
      phone: advocates.phone,
      licenseNumber: advocates.licenseNumber,
      education: advocates.education,
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

  const columns: Column<AdvocateRow>[] = [
    { key: 'fullName', header: 'Nama', cell: (r) => r.fullName },
    { key: 'phone', header: 'Telepon', cell: (r) => r.phone },
    { key: 'licenseNumber', header: 'Lisensi', cell: (r) => r.licenseNumber ?? '-' },
    { key: 'createdAt', header: 'Dibuat', cell: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Data Advokat"
        description="Advokat kantor yang dapat ditugaskan pada perkara."
        actions={<CreateAdvocateDialog />}
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
          hint: isAdmin
            ? 'Tambahkan data advokat untuk staf.'
            : 'Lengkapi data advokat Anda.',
          action: <CreateAdvocateDialog />,
        }}
      />
    </div>
  );
}
