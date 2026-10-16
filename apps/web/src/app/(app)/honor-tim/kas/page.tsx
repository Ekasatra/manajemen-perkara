/** Kas kantor (Agent F · F5). Hanya Admin + user di setting `kas_viewers`. */
import { getKasSummary } from '@ekasatra/core/honor-tim';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FileHeader } from '@/components/ui/file-header';
import { FigureStrip } from '@/components/ui/figure-strip';
import type { FigureItem } from '@/components/ui/figure-strip';
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
  const figures: FigureItem[] = [
    { label: 'Total tagihan', value: formatRupiah(kas.totalBilled) },
    { label: `Kas kantor (${kas.kasPersen}%)`, value: formatRupiah(kas.totalKas) },
    { label: 'Dana distribusi', value: formatRupiah(kas.totalFund) },
    { label: 'Sudah didistribusikan', value: formatRupiah(kas.distributed) },
  ];

  return (
    <div>
      <FileHeader back={{ href: '/honor-tim', label: 'Honor Tim' }} title="Kas Kantor" />
      <div className="mb-6">
        <FigureStrip label="Ringkasan kas kantor" items={figures} />
      </div>
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
