/**
 * Halaman daftar Klien gaya GAS: pencarian + tipe, kolom klien (avatar), kontak, jumlah perkara,
 * dan status portal. Baris membuka halaman rincian klien.
 */
import Link from 'next/link';
import { and, count, desc, ilike, or, sql } from 'drizzle-orm';
import { createDb, clients } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can, countCasesByClient } from '@ekasatra/core';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { CreateClientDialog } from '@/modules/clients/create-client-dialog';
import { ContactList } from '@/modules/parties/contact-list';
import { PartyActions } from '@/modules/parties/party-actions';

const TYPES = ['Perorangan', 'Perusahaan', 'Instansi'] as const;

type ClientRow = {
  id: string;
  clientCode: string;
  name: string;
  type: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  contacts: unknown;
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
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const type = TYPES.find((t) => t === params.tipe);

  const conds = [];
  if (q) {
    const like = `%${q}%`;
    conds.push(
      or(
        ilike(clients.name, like),
        ilike(clients.clientCode, like),
        ilike(clients.phone, like),
        ilike(clients.email, like),
        sql`${clients.contacts}::text ilike ${like}`,
      ),
    );
  }
  if (type) conds.push(sql`${clients.type} = ${type}`);
  const where = conds.length ? and(...conds) : undefined;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: clients.id,
        clientCode: clients.clientCode,
        name: clients.name,
        type: clients.type,
        phone: clients.phone,
        email: clients.email,
        address: clients.address,
        contacts: clients.contacts,
        portalEnabled: clients.portalEnabled,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .where(where)
      .orderBy(desc(clients.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(clients).where(where),
  ]);
  const caseCount = await countCasesByClient(
    db,
    user,
    rows.map((r) => r.id),
  );

  const total = countRows[0]?.value ?? 0;
  const canEdit = can(user, 'U', 'clients');
  const canDelete = can(user, 'D', 'clients');

  const columns: Column<ClientRow>[] = [
    {
      key: 'name',
      header: 'Klien',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.name} size={9} />
          <div>
            <Link href={`/clients/${r.id}`} className="font-semibold text-navy-800 hover:underline">
              {r.name}
            </Link>
            <div className="text-xs text-navy-400">
              {r.clientCode} · {r.type ?? '-'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Kontak',
      cell: (r) => (
        <ContactList
          contacts={
            Array.isArray(r.contacts) && r.contacts.length
              ? r.contacts
              : [
                  ...(r.phone ? [{ type: 'Telepon', value: r.phone }] : []),
                  ...(r.email ? [{ type: 'Email', value: r.email }] : []),
                ]
          }
        />
      ),
    },
    {
      key: 'cases',
      header: 'Perkara',
      cell: (r) => <Badge tone="neutral">{caseCount[r.id] ?? 0} perkara</Badge>,
    },
    {
      key: 'portal',
      header: 'Portal',
      cell: (r) => (
        <Badge tone={r.portalEnabled ? 'success' : 'neutral'}>
          {r.portalEnabled ? 'Ya' : 'Tidak'}
        </Badge>
      ),
    },
    ...(canEdit || canDelete
      ? [
          {
            key: 'aksi',
            header: '',
            cell: (r: ClientRow) => (
              <PartyActions entity="clients" row={r} canEdit={canEdit} canDelete={canDelete} />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title="Klien"
        description={`${total} klien terdaftar.`}
        actions={can(user, 'C', 'clients') ? <CreateClientDialog /> : undefined}
      />
      <div className="card-surface mb-4">
        <FilterBar
          q={q}
          placeholder="Cari nama, kode, kontak…"
          selects={[
            {
              name: 'tipe',
              label: 'Tipe klien',
              all: 'Semua tipe',
              value: type ?? '',
              options: TYPES.map((t) => ({ value: t, label: t })),
            },
          ]}
        />
      </div>
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
          action: can(user, 'C', 'clients') ? <CreateClientDialog /> : undefined,
        }}
      />
    </div>
  );
}
