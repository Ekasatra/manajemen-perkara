/**
 * Halaman daftar Perkara (Agent D · D1/D5).
 */
import { createDb } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { requireUser, ensureCan, listCases } from '@ekasatra/core';
import { PageHeader } from '@/components/ui/page-header';
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

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'cases');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  const q = typeof params.q === 'string' ? params.q : undefined;

  const { rows, total } = await listCases(db, user, { page, pageSize, offset, q });

  const columns: Column<CaseRow>[] = [
    { key: 'regNo', header: 'No. Reg', cell: (r) => r.regNo },
    {
      key: 'title',
      header: 'Judul',
      cell: (r) => <a href={`/cases/${r.id}`} className="text-navy-700 hover:underline">{r.title}</a>,
    },
    { key: 'status', header: 'Status', cell: (r) => <CaseStatusBadge status={r.status} /> },
    { key: 'startDate', header: 'Mulai', cell: (r) => (r.startDate ? formatDate(r.startDate) : '-') },
    {
      key: 'upayaDeadline',
      header: 'Batas Upaya',
      cell: (r) => (r.upayaDeadline ? formatDate(r.upayaDeadline) : '-'),
    },
    { key: 'createdAt', header: 'Dibuat', cell: (r) => formatDate(r.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Perkara"
        description="Register perkara: nomor registrasi, status, dan batas upaya hukum."
        actions={<CreateCaseDialog />}
      />
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
