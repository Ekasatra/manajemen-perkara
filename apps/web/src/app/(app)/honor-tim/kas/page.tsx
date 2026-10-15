/** Kas kantor (Agent F · F5). Hanya Admin + user di setting `kas_viewers`. */
import Link from 'next/link';
import { getKasSummary } from '@ekasatra/core/honor-tim';
import { DataTable, type Column } from '@/components/ui/data-table';
import { formatRupiah } from '@/lib/format';
import { pageContext } from '@/modules/invoices/route-ctx';

type Row = Awaited<ReturnType<typeof getKasSummary>>['cases'][number];

export default async function KasPage() {
  const { db, user } = await pageContext();
  const kas = await getKasSummary(db, user); // FORBIDDEN bila bukan Admin/kas_viewers

  const columns: Column<Row>[] = [
    { key: 'case', header: 'Perkara', cell: (r) => `${r.regNo} · ${r.title}` },
    {
      key: 'billed',
      header: 'Total tagihan',
      align: 'right',
      cell: (r) => formatRupiah(r.totalBilled),
    },
    { key: 'kas', header: 'Kas', align: 'right', cell: (r) => formatRupiah(r.kas) },
  ];
  const cards: [string, string][] = [
    ['Total tagihan', formatRupiah(kas.totalBilled)],
    [`Kas kantor (${kas.kasPersen}%)`, formatRupiah(kas.totalKas)],
    ['Dana distribusi', formatRupiah(kas.totalFund)],
    ['Sudah didistribusikan', formatRupiah(kas.distributed)],
  ];

  return (
    <div>
      <p className="mb-1 text-sm">
        <Link href="/honor-tim" className="text-navy-600 underline">
          ← Honor &amp; Kas
        </Link>
      </p>
      <h1 className="text-2xl font-semibold text-navy-700">Kas Kantor</h1>
      <dl className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-md border border-navy-100 p-3">
            <dt className="text-xs text-navy-500">{k}</dt>
            <dd className="mt-1 text-lg font-semibold text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>
      <DataTable<Row>
        caption="Kas per perkara"
        columns={columns}
        rows={kas.cases}
        rowKey={(r) => r.caseId}
        page={1}
        pageSize={Math.max(kas.cases.length, 1)}
        total={kas.cases.length}
        basePath="/honor-tim/kas"
        empty={{ title: 'Belum ada kas', hint: 'Kas terbentuk dari invoice yang terkait perkara.' }}
      />
    </div>
  );
}
