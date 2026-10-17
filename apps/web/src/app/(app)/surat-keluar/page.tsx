/** Daftar Surat Keluar (Agent E · E2/E5). */
import Link from 'next/link';
import { FileCode2, Paperclip } from 'lucide-react';
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
import { Avatar } from '@/components/ui/avatar';
import { buttonClass } from '@/components/ui/styles';
import { FilterBar } from '@/components/ui/filter-bar';
import { JenisBadge, SuratKeluarStatusBadge } from '@/modules/surat/surat-badges';
import { CreateSuratKeluarDialog } from '@/modules/surat-keluar/create-surat-keluar-dialog';

const TABS = [
  ['all', 'Semua'],
  ['mine', 'Menunggu Saya'],
  ['Draft', 'Draft'],
  ['Review', 'Review'],
  ['Siap_TTD', 'Siap TTD'],
  ['Ditandatangani', 'Ditandatangani'],
  ['Terkirim', 'Terkirim'],
] as const;
const JENIS = ['Perkara', 'Instansi'] as const;

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
  const tab = TABS.find(([k]) => k === str('tab'))?.[0] ?? 'all';
  const jenis = JENIS.find((j) => j === str('jenis'));
  const status = SURAT_KELUAR_STATUS.find((s) => s === tab) as SuratKeluarStatus | undefined;

  const [{ rows, total }, cases, staff] = await Promise.all([
    listSuratKeluar(db, user, {
      q: str('q'),
      status,
      jenis,
      waiting: tab === 'mine',
      page: { pageSize, offset },
    }),
    listCaseOptions(db, user),
    listStaffOptions(db),
  ]);

  const staffName = new Map(staff.map((p) => [p.id, p.fullName]));
  // Posisi = orang yang sedang ditunggu: reviewer saat Review, penandatangan saat Siap TTD.
  const holder = (r: Row) =>
    r.status === 'Review' ? r.reviewerId : r.status === 'Siap_TTD' ? r.signerId : null;

  const columns: Column<Row>[] = [
    {
      key: 'noSurat',
      header: 'Nomor / Tanggal',
      cell: (r) => (
        <div>
          <Link
            href={`/surat-keluar/${r.id}`}
            className="font-semibold text-navy-800 hover:underline"
          >
            {r.noSurat}
          </Link>
          <div className="text-xs text-navy-400">{formatDate(r.tglSurat)}</div>
        </div>
      ),
    },
    { key: 'jenis', header: 'Jenis', cell: (r) => <JenisBadge value={r.jenis} /> },
    {
      key: 'kepada',
      header: 'Kepada / Perihal',
      cell: (r) => (
        <div>
          <div className="font-medium">{r.kepada}</div>
          <div className="line-clamp-2 max-w-sm text-xs text-navy-500">{r.perihal}</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', cell: (r) => <SuratKeluarStatusBadge value={r.status} /> },
    {
      key: 'posisi',
      header: 'Posisi',
      cell: (r) => {
        const id = holder(r);
        const name = id ? staffName.get(id) : null;
        if (!id || !name) return <span className="text-navy-300">—</span>;
        const me = id === user.userId;
        return (
          <span className="flex items-center gap-2 text-xs">
            <Avatar name={name} size={7} />
            <span className={me ? 'font-bold text-gold-700' : ''}>{me ? 'Anda' : name}</span>
          </span>
        );
      },
    },
    {
      key: 'pembuat',
      header: 'Pembuat',
      cell: (r) => (
        <span className="text-xs">{(r.createdBy && staffName.get(r.createdBy)) || '—'}</span>
      ),
    },
    {
      key: 'file',
      header: '',
      cell: (r) => (
        <a
          href={`/api/v1/surat-keluar/${r.id}/file`}
          title="File surat"
          aria-label={`File surat ${r.noSurat}`}
          className="inline-flex size-11 items-center justify-center rounded-control text-navy-500 hover:bg-navy-100"
        >
          <Paperclip aria-hidden="true" size={15} />
        </a>
      ),
    },
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
        description="Draft, review, tanda tangan, lalu kirim."
        actions={
          <>
            <Link href="/templates" className={buttonClass.secondary}>
              <FileCode2 aria-hidden="true" size={15} /> Template
            </Link>
            {create}
          </>
        }
      />
      <div className="card-surface mb-4">
        <div className="border-b border-navy-50 p-3">
          <nav
            aria-label="Kategori surat keluar"
            className="flex w-full gap-[12px] overflow-x-auto rounded-control bg-navy-50/70 p-1 sm:w-fit"
          >
            {TABS.map(([key, label]) => {
              const qs = new URLSearchParams();
              if (key !== 'all') qs.set('tab', key);
              if (jenis) qs.set('jenis', jenis);
              if (str('q')) qs.set('q', str('q')!);
              return (
                <Link
                  key={key}
                  href={`/surat-keluar${qs.size ? `?${qs}` : ''}`}
                  aria-current={tab === key ? 'page' : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition md:min-h-9 ${
                    tab === key
                      ? 'bg-surface text-navy-800 shadow-soft'
                      : 'text-navy-500 hover:bg-surface/70 hover:text-navy-800'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <FilterBar
          q={str('q') ?? ''}
          placeholder="Cari nomor, tujuan, perihal…"
          hidden={{ tab: tab === 'all' ? '' : tab }}
          selects={[
            {
              name: 'jenis',
              label: 'Jenis surat',
              all: 'Semua jenis',
              value: jenis ?? '',
              options: JENIS.map((v) => ({ value: v, label: v })),
            },
          ]}
        />
      </div>
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
          title: 'Tidak ada surat pada kategori ini',
          hint: 'Buat surat sebagai Draft, lalu ajukan untuk direview dan ditandatangani.',
          action: create,
        }}
      />
    </div>
  );
}
