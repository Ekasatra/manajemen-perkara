/**
 * Halaman daftar Pihak Lawan (Agent C · C4).
 */
import { and, count, desc, ilike, or, sql } from 'drizzle-orm';
import { createDb, opponents } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can, countCasesByOpponent } from '@ekasatra/core';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { FilterBar } from '@/components/ui/filter-bar';
import { ContactList } from '@/modules/parties/contact-list';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { CreateOpponentDialog } from '@/modules/opponents/create-opponent-dialog';
import { PartyActions } from '@/modules/parties/party-actions';

type OpponentRow = {
  id: string;
  name: string;
  type: string | null;
  contacts: unknown;
  address: string | null;
  createdAt: Date;
};

const TYPES = ['Perorangan', 'Perusahaan', 'Instansi'] as const;

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
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const type = TYPES.find((t) => t === params.tipe);
  const conds = [];
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(opponents.name, like),
        ilike(opponents.address, like),
        sql`${opponents.contacts}::text ilike ${like}`,
      ),
    );
  }
  if (type) conds.push(sql`${opponents.type} = ${type}`);
  const where = conds.length ? and(...conds) : undefined;

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
      .where(where)
      .orderBy(desc(opponents.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(opponents).where(where),
  ]);

  const caseCount = await countCasesByOpponent(
    db,
    user,
    rows.map((r) => r.id),
  );
  const total = countRows[0]?.value ?? 0;
  const canEdit = can(user, 'U', 'opponents');
  const canDelete = can(user, 'D', 'opponents');

  const columns: Column<OpponentRow>[] = [
    {
      key: 'name',
      header: 'Pihak Lawan',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={9} />
          <div>
            <div className="font-semibold text-navy-800">{r.name}</div>
            <div className="text-xs text-navy-400">{r.type ?? '-'}</div>
          </div>
        </div>
      ),
    },
    { key: 'contacts', header: 'Kontak', cell: (r) => <ContactList contacts={r.contacts} /> },
    {
      key: 'address',
      header: 'Alamat',
      cell: (r) => <span className="line-clamp-2 max-w-xs">{r.address ?? '—'}</span>,
    },
    {
      key: 'cases',
      header: 'Perkara',
      cell: (r) => <Badge tone="neutral">{caseCount[r.id] ?? 0} perkara</Badge>,
    },
    ...(canEdit || canDelete
      ? [
          {
            key: 'aksi',
            header: '',
            cell: (r: OpponentRow) => (
              <PartyActions entity="opponents" row={r} canEdit={canEdit} canDelete={canDelete} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Pihak Lawan"
        description="Data pihak lawan pada perkara."
        actions={<CreateOpponentDialog />}
      />
      <div className="card-surface mb-4">
        <FilterBar
          q={q}
          placeholder="Cari nama, alamat, kontak…"
          selects={[
            {
              name: 'tipe',
              label: 'Tipe',
              all: 'Semua tipe',
              value: type ?? '',
              options: TYPES.map((t) => ({ value: t, label: t })),
            },
          ]}
        />
      </div>
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
