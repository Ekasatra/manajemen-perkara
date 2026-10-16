/** Daftar Surat Keluar (Agent E · E2/E5). */
import Link from 'next/link';
import { can } from '@ekasatra/core';
import {
  SURAT_KELUAR_STATUS,
  listCaseOptions,
  listStaffOptions,
  listSuratKeluar,
  wibToday,
  type SuratKeluarStatus,
} from '@ekasatra/core/surat';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatDate } from '@/lib/format';
import { parsePageQuery, type SearchParams } from '@/lib/pagination';
import { pageCtx } from '@/modules/surat/page-ctx';
import { FilterForm } from '@/modules/surat/filter-form';
import { CreateSuratKeluarDialog } from '@/modules/surat-keluar/create-surat-keluar-dialog';

type Row = Awaited<ReturnType<typeof listSuratKeluar>>['rows'][number];

export default async function SuratKeluarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { db, user } = await pageCtx();
  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  const str = (k: string) => (typeof params[k] === 'string' ? (params[k] as string) : undefined);
  const status = SURAT_KELUAR_STATUS.find((s) => s === str('status')) as SuratKeluarStatus | undefined;

  const [{ rows, total }, cases, staff] = await Promise.all([
    listSuratKeluar(db, user, { q: str('q'), status, page: { pageSize, offset } }),
    listCaseOptions(db, user),
    listStaffOptions(db),
  ]);

  const columns: Column<Row>[] = [
    {
      key: 'noSurat',
      header: 'Nomor',
      cell: (r) => (
        <Link href={`/surat-keluar/${r.id}`} className="font-medium text-navy-700 underline">
          {r.noSurat}
        </Link>
      ),
    },
    { key: 'tglSurat', header: 'Tanggal', cell: (r) => formatDate(r.tglSurat) },
    { key: 'kepada', header: 'Kepada', cell: (r) => r.kepada },
    { key: 'perihal', header: 'Perihal', cell: (r) => r.perihal },
    { key: 'jenis', header: 'Jenis', cell: (r) => r.jenis },
    { key: 'status', header: 'Status', cell: (r) => r.status.replace('_', ' ') },
  ];

  const create = can(user, 'C', 'surat_keluar') ? (
    <CreateSuratKeluarDialog
      today={wibToday().date}
      cases={cases.map((c) => ({ id: c.id, label: `${c.regNo} · ${c.title}` }))}
      reviewers={staff
        .filter((s) => s.role === 'Advokat')
        .map((s) => ({ id: s.id, label: s.fullName }))}
    />
  ) : null;

  return (
    <div>
      <PageHeader
        title="Surat Keluar"
        description="Register surat keluar dan alur persetujuannya."
        actions={create}
      />
      <FilterForm q={str('q')} status={status} statuses={SURAT_KELUAR_STATUS} />
      <DataTable<Row>
        caption="Daftar surat keluar"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/surat-keluar"
        searchParams={params}
        empty={{
          title: 'Belum ada surat keluar',
          hint: 'Buat surat sebagai Draft, lalu ajukan untuk direview dan ditandatangani.',
          action: create,
        }}
      />
    </div>
  );
}
