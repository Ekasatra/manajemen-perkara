/** Daftar Surat Masuk (Agent E · E1). */
import Link from 'next/link';
import { can } from '@ekasatra/core';
import { listCaseOptions, listStaffOptions, listSuratMasuk } from '@ekasatra/core/surat';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatDate } from '@/lib/format';
import { parsePageQuery, type SearchParams } from '@/lib/pagination';
import { pageCtx } from '@/modules/surat/page-ctx';
import { FilterForm } from '@/modules/surat/filter-form';
import { CreateSuratMasukDialog } from '@/modules/surat-masuk/create-surat-masuk-dialog';

const STATUS = ['Belum', 'Didisposisi', 'Selesai'] as const;
type Row = Awaited<ReturnType<typeof listSuratMasuk>>['rows'][number];

export default async function SuratMasukPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { db, user } = await pageCtx();
  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : undefined);
  const status = STATUS.find((s) => s === str('status'));

  const [{ rows, total }, cases, staff] = await Promise.all([
    listSuratMasuk(db, user, { q: str('q'), status, page: { pageSize, offset } }),
    listCaseOptions(db, user),
    listStaffOptions(db),
  ]);

  const columns: Column<Row>[] = [
    {
      key: 'noAgenda',
      header: 'No. Agenda',
      cell: (r) => (
        <Link href={`/surat-masuk/${r.id}`} className="font-medium text-navy-700 underline">
          {r.noAgenda}
        </Link>
      ),
    },
    { key: 'tglTerima', header: 'Diterima', cell: (r) => formatDate(r.tglTerima) },
    { key: 'sender', header: 'Pengirim', cell: (r) => r.sender },
    { key: 'subject', header: 'Perihal', cell: (r) => r.subject },
    { key: 'sifat', header: 'Sifat', cell: (r) => r.sifat },
    { key: 'status', header: 'Status', cell: (r) => r.status },
  ];

  const create = can(user, 'C', 'surat_masuk') ? (
    <CreateSuratMasukDialog
      cases={cases.map((c) => ({ id: c.id, label: `${c.regNo} — ${c.title}` }))}
      staff={staff.map((s) => ({ id: s.id, label: s.fullName }))}
    />
  ) : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-700">Surat Masuk</h1>
        {create}
      </div>
      <FilterForm q={str('q')} status={status} statuses={STATUS} />
      <DataTable<Row>
        caption="Daftar surat masuk"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/surat-masuk"
        searchParams={params}
        empty={{
          title: 'Belum ada surat masuk',
          hint: 'Catat surat yang diterima kantor, lalu disposisikan ke staf.',
          action: create,
        }}
      />
    </div>
  );
}
