/**
 * Honor Tim (Agent F · F4–F5). Admin: daftar perkara + state distribusi. Semua staf:
 * "Honor saya" (hanya nilai yang sudah didistribusikan).
 */
import Link from 'next/link';
import { Briefcase, Landmark, User } from 'lucide-react';
import { can, ensureCan } from '@ekasatra/core';
import {
  canUserViewKas,
  getKasSummary,
  listHonorCases,
  listMyHonor,
  type HonorCaseListItem,
  type MyHonorItem,
} from '@ekasatra/core/honor-tim';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { StatTile } from '@/components/ui/stat-tile';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { parsePageQuery, type SearchParams } from '@/lib/pagination';
import { pageContext } from '@/modules/invoices/route-ctx';

const STATE_LABEL: Record<string, string> = {
  Draft: 'Belum didistribusikan',
  Berubah: 'Ada perubahan',
  Terdistribusi: 'Terdistribusi',
};
const STATE_TONE: Record<string, BadgeTone> = {
  Draft: 'neutral',
  Berubah: 'warning',
  Terdistribusi: 'success',
};

export default async function HonorTimPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { db, user } = await pageContext();
  ensureCan(user, 'R', 'honor_tim');
  const isAdmin = can(user, 'U', 'honor_tim');
  const params = await searchParams;
  const { page, pageSize } = parsePageQuery(params);

  const tab = params.tab === 'saya' ? 'saya' : 'perkara';

  const [mine, kasVisible, managed] = await Promise.all([
    listMyHonor(db, user),
    canUserViewKas(db, user),
    isAdmin && tab === 'perkara' ? listHonorCases(db, user, { page, pageSize }) : null,
  ]);
  const kas = kasVisible ? await getKasSummary(db, user) : null;
  const mineTotal = mine.reduce((n, r) => n + r.amount, 0);
  const minePaid = mine.filter((r) => r.status === 'Dibayar').reduce((n, r) => n + r.amount, 0);

  const myColumns: Column<MyHonorItem>[] = [
    {
      key: 'case',
      header: 'Perkara',
      cell: (r) => (
        <div>
          <Link href={`/cases/${r.caseId}`} className="font-semibold text-navy-800 hover:underline">
            {r.title ?? '-'}
          </Link>
          <div className="text-xs text-navy-400">{r.regNo ?? '-'}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Honor',
      align: 'right',
      cell: (r) => (
        <div>
          <b>{formatRupiah(r.amount)}</b>
          <div className="text-[11px] text-navy-400">{formatDate(r.publishedAt)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Pembayaran',
      cell: (r) => (
        <Badge tone={r.status === 'Dibayar' ? 'success' : 'warning'}>
          {r.status === 'Dibayar' ? 'Sudah dibayar' : 'Belum dibayar'}
        </Badge>
      ),
    },
    { key: 'paid', header: 'Dibayar pada', cell: (r) => formatDate(r.paidAt) },
  ];

  const caseColumns: Column<HonorCaseListItem>[] = [
    {
      key: 'case',
      header: 'Perkara',
      cell: (r) => (
        <div>
          <Link
            href={`/honor-tim/${r.case.id}`}
            className="font-semibold text-navy-800 hover:underline"
          >
            {r.case.title}
          </Link>
          <div className="text-xs text-navy-400">{r.case.regNo}</div>
        </div>
      ),
    },
    {
      key: 'billed',
      header: 'Total tagihan',
      align: 'right',
      cell: (r) => formatRupiah(r.totalBilled),
    },
    { key: 'kas', header: 'Kas', align: 'right', cell: (r) => formatRupiah(r.kas) },
    { key: 'fund', header: 'Dana distribusi', align: 'right', cell: (r) => formatRupiah(r.fund) },
    {
      key: 'pub',
      header: 'Terdistribusi',
      align: 'right',
      cell: (r) => formatRupiah(r.publishedTotal),
    },
    {
      key: 'state',
      header: 'Status',
      cell: (r) => (
        <Badge tone={STATE_TONE[r.state] ?? 'neutral'}>{STATE_LABEL[r.state] ?? r.state}</Badge>
      ),
    },
  ];

  const tabClass = (active: boolean) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition ${
      active
        ? 'bg-surface text-navy-800 shadow-soft'
        : 'text-navy-500 hover:bg-surface/70 hover:text-navy-800'
    }`;

  return (
    <div>
      <PageHeader
        title="Honor Tim"
        actions={
          kasVisible ? (
            <Link href="/honor-tim/kas" className={buttonClass.secondary}>
              <Landmark aria-hidden="true" size={15} /> Kas Kantor
            </Link>
          ) : null
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isAdmin && kas ? (
          <>
            <StatTile
              label="Total Biaya Perkara"
              value={formatRupiah(kas.totalBilled)}
              note="ditagihkan ke klien"
            />
            <StatTile
              label={`Kas Kantor (${kas.kasPersen}%)`}
              tone="gold"
              value={formatRupiah(kas.totalKas)}
              note="dipotong dari biaya perkara"
            />
            <StatTile
              label="Dapat Didistribusikan"
              value={formatRupiah(kas.totalFund)}
              note="untuk seluruh tim"
            />
            <StatTile
              label="Sudah Didistribusikan"
              tone="success"
              value={formatRupiah(kas.distributed)}
              note={`sisa ${formatRupiah(Math.max(kas.totalFund - kas.distributed, 0))}`}
            />
          </>
        ) : (
          <>
            <StatTile
              label="Total Honor Saya"
              value={formatRupiah(mineTotal)}
              note={`${mine.length} perkara sudah didistribusikan`}
            />
            <StatTile label="Sudah Dibayar" tone="success" value={formatRupiah(minePaid)} />
            <StatTile
              label="Belum Dibayar"
              tone="gold"
              value={formatRupiah(mineTotal - minePaid)}
            />
          </>
        )}
      </div>

      {isAdmin ? (
        <nav
          aria-label="Tampilan honor"
          className="mb-4 flex w-full gap-1 overflow-x-auto rounded-control border border-white/70 bg-surface/60 p-1 sm:w-fit"
        >
          <Link
            href="/honor-tim"
            aria-current={tab === 'perkara' ? 'page' : undefined}
            className={tabClass(tab === 'perkara')}
          >
            <Briefcase aria-hidden="true" size={15} /> Per Perkara
          </Link>
          <Link
            href="/honor-tim?tab=saya"
            aria-current={tab === 'saya' ? 'page' : undefined}
            className={tabClass(tab === 'saya')}
          >
            <User aria-hidden="true" size={15} /> Honor Saya
            <span className="text-[10px] text-navy-400">{mine.length}</span>
          </Link>
        </nav>
      ) : null}

      {managed ? (
        <DataTable<HonorCaseListItem>
          caption="Perkara berpenagihan"
          columns={caseColumns}
          rows={managed.items}
          rowKey={(r) => r.case.id}
          page={managed.page}
          pageSize={managed.pageSize}
          total={managed.total}
          basePath="/honor-tim"
          searchParams={params}
          empty={{
            title: 'Belum ada perkara berpenagihan',
            hint: 'Perkara muncul di sini setelah memiliki invoice.',
          }}
        />
      ) : (
        <DataTable<MyHonorItem>
          caption="Honor saya"
          columns={myColumns}
          rows={mine}
          rowKey={(r) => r.caseId}
          page={1}
          pageSize={Math.max(mine.length, 1)}
          total={mine.length}
          basePath="/honor-tim"
          empty={{
            title: 'Anda belum tercatat dalam tim perkara mana pun',
            hint: 'Nilai honor tampil setelah Admin mendistribusikannya.',
          }}
        />
      )}
      {!isAdmin ? (
        <p className="mt-3 text-xs text-navy-400">
          Honor ditetapkan dan didistribusikan oleh Admin. Anda hanya dapat melihat honor Anda
          sendiri.
        </p>
      ) : null}
    </div>
  );
}
