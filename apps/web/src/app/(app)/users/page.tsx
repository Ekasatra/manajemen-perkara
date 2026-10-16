/**
 * Halaman daftar Pengguna (Agent C · C2).
 * Server component: query DB langsung, render DataTable + tombol buat (client).
 */
import { count, desc } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can } from '@ekasatra/core';
import { ShieldCheck } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { CreateUserDialog } from '@/modules/users/create-user-dialog';
import { UserActions } from '@/modules/users/user-actions';

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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

  const activeCount = rows.filter((r) => r.isActive).length;
  const ROLE_TONE: Record<string, BadgeTone> = {
    SuperAdmin: 'indigo',
    Admin: 'info',
    Advokat: 'neutral',
    Paralegal: 'info',
  };

  const columns: Column<UserRow>[] = [
    {
      key: 'fullName',
      header: 'User',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.fullName} size={9} />
          <div>
            <div
              className={`font-semibold ${r.isActive ? 'text-navy-800' : 'text-navy-300 line-through'}`}
            >
              {r.fullName}
            </div>
            <div className="text-xs text-navy-400">{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      cell: (r) => (
        <Badge tone={ROLE_TONE[r.role] ?? 'neutral'}>
          {r.role === 'SuperAdmin' ? 'Super Admin' : r.role}
        </Badge>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      cell: (r) => (
        <Badge tone={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'Aktif' : 'Nonaktif'}</Badge>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Login Terakhir',
      cell: (r) => (
        <span className="text-xs">
          {r.lastLoginAt ? formatDate(r.lastLoginAt) : 'belum pernah'}
        </span>
      ),
    },
    {
      key: 'aksi',
      header: '',
      cell: (r) => {
        const isSuper = r.role === 'SuperAdmin';
        const canEdit = can(user, 'U', 'users') && (!isSuper || user.role === 'superadmin');
        const canDelete = can(user, 'D', 'users') && !isSuper && r.id !== user.userId;
        return canEdit || canDelete ? (
          <UserActions row={r} canEdit={canEdit} canDelete={canDelete} />
        ) : null;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Manajemen User"
        description={`${total} akun · ${activeCount} aktif`}
        actions={<CreateUserDialog />}
      />
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
      <section className="card-surface mt-4 p-5 text-sm text-navy-600">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-navy-800">
          <ShieldCheck aria-hidden="true" size={16} className="text-gold-500" /> Catatan Peran
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-xs text-navy-500">
          <li>
            <b>Admin</b> memiliki kewenangan penuh atas seluruh menu dan data.
          </li>
          <li>
            <b>Advokat &amp; Paralegal</b> hanya melihat perkara yang ditugaskan dan tidak dapat
            membuka menu Klien, Pihak Lawan, Biaya Perkara, Laporan, Pengaturan, dan Manajemen User.
            Di Honor Tim mereka hanya melihat honor sendiri.
          </li>
          <li>
            <b>Klien</b> tidak memerlukan akun. Gunakan tautan Portal Klien dari halaman rincian
            klien.
          </li>
        </ul>
      </section>
    </div>
  );
}
