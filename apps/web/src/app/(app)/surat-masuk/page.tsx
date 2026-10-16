/** Daftar Surat Masuk (Agent E · E1). */
import Link from 'next/link';
import { Briefcase, Paperclip } from 'lucide-react';
import { can } from '@ekasatra/core';
import { listCaseOptions, listStaffOptions, listSuratMasuk } from '@ekasatra/core/surat';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatDate } from '@/lib/format';
import { parsePageQuery, type SearchParams } from '@/lib/pagination';
import { pageCtx } from '@/modules/surat/page-ctx';
import { Avatar } from '@/components/ui/avatar';
import { SuratFilters } from '@/modules/surat/surat-filters';
import { SifatBadge, SuratMasukStatusBadge } from '@/modules/surat/surat-badges';
import { CreateSuratMasukDialog } from '@/modules/surat-masuk/create-surat-masuk-dialog';

const STATUS = ['Belum', 'Didisposisi', 'Selesai'] as const;
const SIFAT = ['Biasa', 'Penting', 'Segera', 'Rahasia'] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
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
  const sifat = SIFAT.find((s) => s === str('sifat'));
  const dari = DATE_RE.test(str('dari') ?? '') ? str('dari') : undefined;
  const sampai = DATE_RE.test(str('sampai') ?? '') ? str('sampai') : undefined;

  const [{ rows, total }, cases, staff] = await Promise.all([
    listSuratMasuk(db, user, {
      q: str('q'),
      status,
      sifat,
      from: dari,
      to: sampai,
      page: { pageSize, offset },
    }),
    listCaseOptions(db, user),
    listStaffOptions(db),
  ]);

  const staffName = new Map(staff.map((p) => [p.id, p.fullName]));
  const caseLabel = new Map(cases.map((c) => [c.id, `${c.regNo} · ${c.title}`]));

  const columns: Column<Row>[] = [
    {
      key: 'noAgenda',
      header: 'No. Agenda',
      cell: (r) => (
        <div>
          <Link
            href={`/surat-masuk/${r.id}`}
            className="font-semibold text-navy-800 hover:underline"
          >
            {r.noAgenda}
          </Link>
          <div className="text-xs text-navy-400">{formatDate(r.tglTerima)}</div>
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Pengirim / No. Surat',
      cell: (r) => (
        <div>
          <div className="font-medium">{r.sender}</div>
          <div className="text-xs text-navy-400">
            {r.noSurat ?? '—'} · {r.tglSurat ? formatDate(r.tglSurat) : '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Perihal',
      cell: (r) => (
        <div>
          <div className="line-clamp-2 max-w-xs">{r.subject}</div>
          {r.caseId && caseLabel.get(r.caseId) ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-control bg-navy-50 px-2 py-1 text-xs text-navy-600">
              <Briefcase aria-hidden="true" size={13} /> {caseLabel.get(r.caseId)}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'sifat', header: 'Sifat', cell: (r) => <SifatBadge value={r.sifat} /> },
    {
      key: 'dispo',
      header: 'Disposisi',
      cell: (r) => {
        const name = r.assignedTo ? staffName.get(r.assignedTo) : null;
        return name ? (
          <span className="flex items-center gap-2 text-xs">
            <Avatar name={name} size={7} /> {name}
          </span>
        ) : (
          <span className="text-navy-300">—</span>
        );
      },
    },
    { key: 'status', header: 'Status', cell: (r) => <SuratMasukStatusBadge value={r.status} /> },
    {
      key: 'file',
      header: '',
      cell: (r) =>
        r.filePath ? (
          <a
            href={`/api/v1/surat-masuk/${r.id}/file`}
            title="Lampiran"
            aria-label={`Lampiran ${r.noAgenda}`}
            className="inline-flex size-8 items-center justify-center rounded-control text-navy-500 hover:bg-navy-100"
          >
            <Paperclip aria-hidden="true" size={15} />
          </a>
        ) : null,
    },
  ];

  const create = can(user, 'C', 'surat_masuk') ? (
    <CreateSuratMasukDialog
      cases={cases.map((c) => ({ id: c.id, label: `${c.regNo} · ${c.title}` }))}
      staff={staff.map((s) => ({ id: s.id, label: s.fullName }))}
    />
  ) : null;

  return (
    <div>
      <PageHeader
        title="Surat Masuk"
        description="Pencatatan, disposisi internal, dan arsip lampiran surat masuk."
        actions={create}
      />
      <div className="card-surface mb-4">
        <SuratFilters
          q={str('q') ?? ''}
          placeholder="Cari pengirim, perihal, nomor…"
          selects={[
            {
              name: 'status',
              label: 'Status',
              all: 'Semua status',
              value: status ?? '',
              options: STATUS.map((v) => ({ value: v, label: v })),
            },
            {
              name: 'sifat',
              label: 'Sifat',
              all: 'Semua sifat',
              value: sifat ?? '',
              options: SIFAT.map((v) => ({ value: v, label: v })),
            },
          ]}
          dates={{
            from: dari ?? '',
            to: sampai ?? '',
            fromLabel: 'Diterima dari',
            toLabel: 'Diterima sampai',
          }}
        />
      </div>
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
