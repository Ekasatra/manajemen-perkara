/**
 * Honor Tim (Agent F · F4–F5). Admin: daftar perkara + state distribusi. Semua staf:
 * "Honor saya" (hanya nilai yang sudah didistribusikan).
 */
import Link from 'next/link';
import { can, ensureCan } from '@ekasatra/core';
import {
  canUserViewKas,
  listHonorCases,
  listMyHonor,
  type HonorCaseListItem,
  type MyHonorItem,
} from '@ekasatra/core/honor-tim';
import { DataTable, type Column } from '@/components/ui/data-table';
import { buttonClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import { parsePageQuery, type SearchParams } from '@/lib/pagination';
import { pageContext } from '@/modules/invoices/route-ctx';

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

  const [mine, kasVisible, managed] = await Promise.all([
    listMyHonor(db, user),
    canUserViewKas(db, user),
    isAdmin ? listHonorCases(db, user, { page, pageSize }) : null,
  ]);

  const myColumns: Column<MyHonorItem>[] = [
    { key: 'case', header: 'Perkara', cell: (r) => (r.regNo ? `${r.regNo} · ${r.title}` : '-') },
    { key: 'amount', header: 'Honor', align: 'right', cell: (r) => formatRupiah(r.amount) },
    { key: 'status', header: 'Status', cell: (r) => r.status },
    { key: 'at', header: 'Didistribusikan', cell: (r) => formatDate(r.publishedAt) },
    { key: 'paid', header: 'Dibayar', cell: (r) => formatDate(r.paidAt) },
  ];

  const caseColumns: Column<HonorCaseListItem>[] = [
    {
      key: 'case',
      header: 'Perkara',
      cell: (r) => (
        <Link href={`/honor-tim/${r.case.id}`} className="font-medium text-navy-700 underline">
          {r.case.regNo} · {r.case.title}
        </Link>
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
    { key: 'state', header: 'State', cell: (r) => r.state },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-navy-700">Honor &amp; Kas</h1>
        {kasVisible && (
          <Link href="/honor-tim/kas" className={buttonClass.secondary}>
            Kas Kantor
          </Link>
        )}
      </div>

      {managed && (
        <section aria-labelledby="h-kelola">
          <h2 id="h-kelola" className="mb-3 text-lg font-semibold text-navy-700">
            Kelola honor per perkara
          </h2>
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
        </section>
      )}

      <section aria-labelledby="h-saya">
        <h2 id="h-saya" className="mb-3 text-lg font-semibold text-navy-700">
          Honor saya
        </h2>
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
            title: 'Belum ada honor yang didistribusikan',
            hint: 'Nilai honor tampil setelah Admin mendistribusikannya.',
          }}
        />
      </section>
    </div>
  );
}
