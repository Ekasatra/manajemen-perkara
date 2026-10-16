/**
 * Halaman daftar Perkara gaya GAS: enam kartu status (klik untuk menyaring), filter, dan tabel
 * dengan klien vs lawan, pengadilan, tim, dan agenda berikutnya.
 */
import Link from 'next/link';
import { and, eq, inArray } from 'drizzle-orm';
import { createDb, profiles } from '@ekasatra/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import {
  requireUser,
  ensureCan,
  can,
  listCasesDetailed,
  getCaseSummaryForDashboard,
} from '@ekasatra/core';
import type { CaseListItem } from '@ekasatra/core';
import { CASE_STATUS } from '@ekasatra/shared';
import { AvatarStack } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, type Column } from '@/components/ui/data-table';
import { parsePageQuery } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { formatDate } from '@/lib/format';
import { daysBetween, todayWib } from '@/modules/dashboard/metrics';
import { CaseFilters } from '@/modules/cases/case-filters';
import { CaseStatusBadge } from '@/modules/cases/case-status-badge';
import { CreateCaseDialog } from '@/modules/cases/create-case-dialog';

const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const db = createDb();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(db, supabase);
  ensureCan(user, 'R', 'cases');

  const params = await searchParams;
  const { page, pageSize, offset } = parsePageQuery(params);
  const q = str(params.q).trim();
  const status = (CASE_STATUS as readonly string[]).includes(str(params.status))
    ? str(params.status)
    : '';
  const caseType = str(params.jenis);
  const advokat = str(params.advokat);
  const today = todayWib();

  const [{ rows, total }, summary, advocates] = await Promise.all([
    listCasesDetailed(db, user, {
      page,
      pageSize,
      offset,
      q: q || undefined,
      status: status || undefined,
      caseType: caseType || undefined,
      memberId: advokat || undefined,
      today,
    }),
    // Ringkasan memakai pembatasan baris yang sama dengan daftar, jadi angkanya cocok dengan yang terlihat.
    getCaseSummaryForDashboard(db, { userId: user.userId, role: user.role }),
    db
      .select({ id: profiles.id, name: profiles.fullName })
      .from(profiles)
      .where(
        and(
          eq(profiles.isActive, true),
          inArray(profiles.role, ['Advokat', 'Admin', 'SuperAdmin']),
        ),
      ),
  ]);
  const countOf = (s: string) => summary.byStatus.find((b) => b.status === s)?.count ?? 0;

  const columns: Column<CaseListItem>[] = [
    {
      key: 'title',
      header: 'Perkara',
      cell: (r) => (
        <div>
          <Link href={`/cases/${r.id}`} className="font-semibold text-navy-800 hover:underline">
            {r.title}
          </Link>
          <div className="text-xs text-navy-400">
            {r.regNo}
            {r.caseType ? ` · ${r.caseType}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'parties',
      header: 'Klien vs Lawan',
      cell: (r) => (
        <div>
          <div>{r.clientName ?? '—'}</div>
          <div className="text-xs text-navy-400">vs {r.opponentName ?? '—'}</div>
        </div>
      ),
    },
    { key: 'court', header: 'Pengadilan', cell: (r) => r.court ?? '—' },
    { key: 'status', header: 'Status', cell: (r) => <CaseStatusBadge status={r.status} /> },
    { key: 'team', header: 'Tim', cell: (r) => <AvatarStack names={r.team.map((t) => t.name)} /> },
    {
      key: 'next',
      header: 'Agenda Berikut',
      cell: (r) => {
        if (!r.next) return <span className="text-navy-300">—</span>;
        const left = daysBetween(today, r.next.date);
        return (
          <div className="text-sm">
            <div>{formatDate(r.next.date)}</div>
            <div className="flex items-center gap-1.5 text-xs text-navy-400">
              {r.next.kind}
              {left <= 3 ? (
                <Badge tone={left <= 0 ? 'danger' : 'warning'}>
                  {left <= 0 ? 'Hari ini' : `H-${left}`}
                </Badge>
              ) : null}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Perkara"
        description="Registrasi, penugasan tim, dan siklus status perkara."
        actions={
          can(user, 'C', 'cases') ? (
            <CreateCaseDialog canAssignTeam={can(user, 'C', 'users')} />
          ) : undefined
        }
      />

      <div className="mb-4 grid grid-cols-3 gap-2 md:grid-cols-6">
        {CASE_STATUS.map((s) => {
          const active = status === s;
          const next = new URLSearchParams();
          if (!active) next.set('status', s);
          return (
            <Link
              key={s}
              href={`/cases${next.size ? `?${next}` : ''}`}
              aria-pressed={active}
              className={`card-surface px-3 py-2.5 text-left transition hover:-translate-y-0.5 ${active ? 'ring-2 ring-gold-400' : ''}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
                {s}
              </div>
              <div className="text-xl font-bold text-navy-800">{countOf(s)}</div>
            </Link>
          );
        })}
      </div>

      <div className="card-surface mb-4">
        <CaseFilters
          q={q}
          status={status}
          caseType={caseType}
          advokat={advokat}
          statuses={CASE_STATUS}
          advocates={advocates}
        />
      </div>

      <DataTable<CaseListItem>
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
          action: <CreateCaseDialog canAssignTeam={can(user, 'C', 'users')} />,
        }}
      />
    </div>
  );
}
