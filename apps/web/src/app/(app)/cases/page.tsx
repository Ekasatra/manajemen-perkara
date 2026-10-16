/**
 * Halaman daftar Perkara (Agent D · D1/D5).
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, can, listCases, getCaseSummaryForDashboard } from '@ekasatra/core';
import { Badge } from '@/components/ui/badge';
import { FigureStrip } from '@/components/ui/figure-strip';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { daysBetween, todayWib } from '@/modules/dashboard/metrics';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { CaseStatusBadge } from '@/modules/cases/case-status-badge';
import { CreateCaseDialog } from '@/modules/cases/create-case-dialog';

type CaseRow = {
  id: string;
  regNo: string;
  title: string;
  status: string;
  startDate: string | null;
  upayaDeadline: string | null;
  createdAt: Date;
};

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'cases');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  const q = typeof params.q === 'string' ? params.q : undefined;

  const [{ rows, total }, summary] = await Promise.all([
    listCases(db, user, { page, pageSize, offset, q }),
    // Ringkasan memakai pembatasan baris yang sama dengan daftar, jadi angkanya cocok dengan yang terlihat.
    getCaseSummaryForDashboard(db, { userId: user.userId, role: user.role }),
  ]);
  const today = todayWib();
  const inUpaya = summary.byStatus
    .filter((s) => ['Putus', 'Banding', 'Kasasi', 'PK'].includes(s.status))
    .reduce((n, s) => n + s.count, 0);

  const columns: Column<CaseRow>[] = [
    { key: 'regNo', header: 'No. Reg', cell: (r) => r.regNo },
    {
      key: 'title',
      header: 'Judul',
      cell: (r) => (
        <a href={`/cases/${r.id}`} className="text-navy-700 hover:underline">
          {r.title}
        </a>
      ),
    },
    { key: 'status', header: 'Status', cell: (r) => <CaseStatusBadge status={r.status} /> },
    {
      key: 'startDate',
      header: 'Mulai',
      cell: (r) => (r.startDate ? formatDate(r.startDate) : '-'),
    },
    {
      key: 'upayaDeadline',
      header: 'Batas Upaya',
      cell: (r) => {
        if (!r.upayaDeadline) return '-';
        const left = daysBetween(today, r.upayaDeadline);
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            {formatDate(r.upayaDeadline)}
            {left <= 14 ? (
              <Badge tone={left <= 3 ? 'danger' : 'warning'}>
                {left < 0 ? 'Lewat' : left === 0 ? 'Hari ini' : `H-${left}`}
              </Badge>
            ) : null}
          </span>
        );
      },
    },
    { key: 'createdAt', header: 'Dibuat', cell: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Perkara"
        description="Register perkara: nomor registrasi, status, dan batas upaya hukum."
        actions={can(user, 'C', 'cases') ? <CreateCaseDialog /> : undefined}
      />

      <div className="mb-6">
        <FigureStrip
          label="Ringkasan perkara"
          items={[
            { label: 'Perkara aktif', value: summary.activeCount },
            { label: 'Dalam upaya hukum', value: inUpaya, note: 'Putus, banding, kasasi, atau PK' },
            { label: 'Perkara selesai', value: summary.completedCount },
          ]}
        />
      </div>

      <form
        method="get"
        role="search"
        className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="sm:w-80">
          <label htmlFor="q" className={labelClass}>
            Cari judul perkara
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ''}
            placeholder="Nama pihak atau judul"
            className={inputClass}
          />
        </div>
        <button type="submit" className={buttonClass.secondary}>
          Cari
        </button>
      </form>
      <DataTable<CaseRow>
        caption="Daftar perkara"
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/cases"
        searchParams={params}
        empty={{
          title: 'Belum ada perkara',
          hint: 'Tambahkan perkara untuk mulai mencatat timeline, jadwal, dan dokumen.',
          action: <CreateCaseDialog />,
        }}
      />
    </div>
  );
}
