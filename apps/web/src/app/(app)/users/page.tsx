/**
 * Halaman daftar Pengguna (Agent C · C2).
 * Server component: query DB langsung, render DataTable + tombol buat (client).
 */
import { count, desc } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { CreateUserDialog } from '@/modules/users/create-user-dialog';

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'users');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        role: profiles.role,
        isActive: profiles.isActive,
        lastLoginAt: profiles.lastLoginAt,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(profiles),
  ]);

  const total = countRows[0]?.value ?? 0;

  const columns: Column<UserRow>[] = [
    { key: 'fullName', header: 'Nama', cell: (r) => r.fullName },
    { key: 'email', header: 'Email', cell: (r) => r.email },
    { key: 'role', header: 'Role', cell: (r) => r.role },
    {
      key: 'isActive',
      header: 'Status',
      cell: (r) => (r.isActive ? 'Aktif' : 'Nonaktif'),
    },
    {
      key: 'lastLoginAt',
      header: 'Login Terakhir',
      cell: (r) => formatDate(r.lastLoginAt),
    },
    {
      key: 'createdAt',
      header: 'Dibuat',
      cell: (r) => formatDate(r.createdAt),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-700">Pengguna</h1>
        <CreateUserDialog />
      </div>
      <DataTable<UserRow>
        caption="Daftar pengguna"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/users"
        searchParams={params}
        empty={{
          title: 'Belum ada pengguna',
          hint: 'Tambahkan pengguna untuk mulai mengelola akses.',
          action: <CreateUserDialog />,
        }}
      />
    </div>
  );
}
