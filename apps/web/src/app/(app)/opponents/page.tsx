/**
 * Halaman daftar Pihak Lawan (Agent C · C4).
 */
import { count, desc } from 'drizzle-orm';
import { createDb, opponents } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { CreateOpponentDialog } from '@/modules/opponents/create-opponent-dialog';

type OpponentRow = {
  id: string;
  name: string;
  type: string | null;
  contacts: unknown;
  address: string | null;
  createdAt: Date;
};

function getPhone(contacts: unknown): string {
  if (!Array.isArray(contacts)) return '-';
  const c = contacts.find(
    (item) =>
      item && typeof item === 'object' && 'type' in item &&
      ['HP', 'WhatsApp', 'Telepon'].includes(String((item as { type: string }).type)),
  );
  return c && typeof c === 'object' && 'value' in c
    ? String((c as { value: string }).value)
    : '-';
}

export default async function OpponentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'opponents');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: opponents.id,
        name: opponents.name,
        type: opponents.type,
        contacts: opponents.contacts,
        address: opponents.address,
        createdAt: opponents.createdAt,
      })
      .from(opponents)
      .orderBy(desc(opponents.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(opponents),
  ]);

  const total = countRows[0]?.value ?? 0;

  const columns: Column<OpponentRow>[] = [
    { key: 'name', header: 'Nama', cell: (r) => r.name },
    { key: 'type', header: 'Tipe', cell: (r) => r.type ?? '-' },
    { key: 'phone', header: 'Telepon', cell: (r) => getPhone(r.contacts) },
    { key: 'address', header: 'Alamat', cell: (r) => r.address ?? '-' },
    { key: 'createdAt', header: 'Dibuat', cell: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Pihak Lawan"
        description="Daftar pihak lawan yang tercatat pada perkara."
        actions={<CreateOpponentDialog />}
      />
      <DataTable<OpponentRow>
        caption="Daftar pihak lawan"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/opponents"
        searchParams={params}
        empty={{
          title: 'Belum ada pihak lawan',
          hint: 'Tambahkan pihak lawan untuk dicatat pada perkara.',
          action: <CreateOpponentDialog />,
        }}
      />
    </div>
  );
}
