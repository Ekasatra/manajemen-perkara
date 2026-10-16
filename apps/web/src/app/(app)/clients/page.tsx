/**
 * Halaman daftar Klien (Agent C · C3).
 */
import { count, desc } from 'drizzle-orm';
import { createDb, clients } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { CreateClientDialog } from '@/modules/clients/create-client-dialog';

type ClientRow = {
  id: string;
  clientCode: string;
  name: string;
  type: string | null;
  phone: string | null;
  email: string | null;
  portalEnabled: boolean;
  createdAt: Date;
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'clients');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: clients.id,
        clientCode: clients.clientCode,
        name: clients.name,
        type: clients.type,
        phone: clients.phone,
        email: clients.email,
        portalEnabled: clients.portalEnabled,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(clients),
  ]);

  const total = countRows[0]?.value ?? 0;

  const columns: Column<ClientRow>[] = [
    { key: 'clientCode', header: 'Kode', cell: (r) => r.clientCode },
    { key: 'name', header: 'Nama', cell: (r) => r.name },
    { key: 'type', header: 'Tipe', cell: (r) => r.type ?? '-' },
    { key: 'phone', header: 'Telepon', cell: (r) => r.phone ?? '-' },
    { key: 'email', header: 'Email', cell: (r) => r.email ?? '-' },
    {
      key: 'portalEnabled',
      header: 'Portal',
      cell: (r) => (r.portalEnabled ? 'Aktif' : 'Nonaktif'),
    },
    { key: 'createdAt', header: 'Dibuat', cell: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Klien"
        description="Daftar klien kantor beserta kode klien."
        actions={<CreateClientDialog />}
      />
      <DataTable<ClientRow>
        caption="Daftar klien"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/clients"
        searchParams={params}
        empty={{
          title: 'Belum ada klien',
          hint: 'Tambahkan klien untuk mulai mencatat perkara.',
          action: <CreateClientDialog />,
        }}
      />
    </div>
  );
}
