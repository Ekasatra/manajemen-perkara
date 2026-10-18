/**
 * Biaya Perkara (invoice) gaya GAS: empat angka ringkas dari seluruh hasil filter, filter status,
 * klien, dan rentang tanggal, lalu daftar dengan jatuh tempo dan status. Admin saja (PRD §4).
 */
import Link from 'next/link';
import { FileDown } from 'lucide-react';
import { requireCan } from '@/lib/guard';
import { listCaseOptions, listClientOptions } from '@ekasatra/core/finance';
import { listInvoices, listInvoicesForReport, type InvoiceListItem } from '@ekasatra/core/invoices';
import { INVOICE_STATUSES, listInvoicesQuerySchema } from '@ekasatra/shared/invoices';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { PageHeader } from '@/components/ui/page-header';
import { StatTile } from '@/components/ui/stat-tile';
import { formatDate, formatRupiah } from '@/lib/format';
import type { SearchParams } from '@/lib/pagination';
import { CreateInvoiceDialog } from '@/modules/invoices/create-invoice-dialog';
import { pageContext } from '@/modules/invoices/route-ctx';
import { StatusBadge } from '@/modules/invoices/status-badge';
import { daysBetween, todayWib } from '@/modules/dashboard/metrics';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { db, user } = await pageContext();
  requireCan(user, 'R', 'invoices');

  const params = await searchParams;
  const parsed = listInvoicesQuerySchema.safeParse({
    status: first(params.status) || undefined,
    clientId: first(params.klien) || undefined,
    from: first(params.dari) || undefined,
    to: first(params.sampai) || undefined,
    page: first(params.page),
  });
  const query = parsed.success ? parsed.data : listInvoicesQuerySchema.parse({});

  const [list, clients, cases, all] = await Promise.all([
    listInvoices(db, user, query),
    listClientOptions(db),
    listCaseOptions(db),
    // Angka ringkas dihitung dari semua invoice yang cocok filter, bukan hanya halaman ini.
    listInvoicesForReport(db, user, {
      status: query.status,
      clientId: query.clientId,
      from: query.from,
      to: query.to,
    }),
  ]);
  const today = todayWib();

  const sum = (f: (r: InvoiceListItem) => number) => all.reduce((n, r) => n + f(r), 0);
  const total = sum((r) => r.amount);
  const paid = sum((r) => r.paidAmount);
  const overdue = all.filter((r) => r.status !== 'Lunas' && r.dueDate && r.dueDate < today);
  const overdueSum = overdue.reduce((n, r) => n + Math.max(r.amount - r.paidAmount, 0), 0);

  const columns: Column<InvoiceListItem>[] = [
    {
      key: 'invoiceNo',
      header: 'Invoice',
      cell: (r) => (
        <div>
          <Link href={`/invoices/${r.id}`} className="font-semibold text-navy-800 hover:underline">
            {r.invoiceNo}
          </Link>
          <div className="text-xs text-navy-400">{formatDate(r.invoiceDate)}</div>
        </div>
      ),
    },
    {
      key: 'party',
      header: 'Klien / Perkara',
      cell: (r) => (
        <div>
          <div>{r.clientName ?? '-'}</div>
          <div className="text-xs text-navy-400">{r.caseRegNo ?? 'Non-perkara'}</div>
        </div>
      ),
    },
    {
      key: 'desc',
      header: 'Uraian',
      cell: (r) => <span className="line-clamp-2 max-w-xs">{r.description ?? '-'}</span>,
    },
    {
      key: 'amount',
      header: 'Jumlah',
      align: 'right',
      cell: (r) => (
        <div>
          <div className="whitespace-nowrap font-semibold">{formatRupiah(r.amount)}</div>
          {r.paidAmount > 0 && r.status !== 'Lunas' ? (
            <div className="whitespace-nowrap text-[11px] text-success-fg">
              dibayar {formatRupiah(r.paidAmount)}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'due',
      header: 'Jatuh Tempo',
      cell: (r) => {
        const late = r.dueDate && r.status !== 'Lunas' ? daysBetween(r.dueDate, today) : 0;
        return (
          <span
            className={`whitespace-nowrap text-xs ${late > 0 ? 'font-semibold text-danger-fg' : ''}`}
          >
            {formatDate(r.dueDate)}
            {late > 0 ? ' · terlambat' : ''}
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'pdf',
      header: '',
      cell: (r) => (
        <a
          href={`/api/v1/invoices/${r.id}/pdf`}
          title={r.status === 'Lunas' ? 'Cetak tanda terima' : 'Cetak invoice'}
          aria-label={`Unduh PDF ${r.invoiceNo}`}
          className={`inline-flex size-11 items-center justify-center rounded-control hover:bg-navy-100 ${
            r.status === 'Lunas' ? 'text-success-fg' : 'text-navy-500'
          }`}
        >
          <FileDown aria-hidden="true" size={16} />
        </a>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Biaya Perkara"
        description="Tagihan, pembayaran, dan jatuh tempo."
        actions={<CreateInvoiceDialog clients={clients} cases={cases} />}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Total Ditagih"
          value={formatRupiah(total)}
          note={`${all.length} invoice`}
        />
        <StatTile
          label="Terbayar"
          tone="success"
          value={formatRupiah(paid)}
          note={`${total ? Math.round((paid / total) * 100) : 0}% dari tagihan`}
        />
        <StatTile
          label="Outstanding"
          tone="gold"
          value={formatRupiah(Math.max(total - paid, 0))}
          note={`${all.filter((r) => r.status !== 'Lunas').length} belum lunas`}
        />
        <StatTile
          label="Lewat Jatuh Tempo"
          tone="danger"
          value={formatRupiah(overdueSum)}
          note={`${overdue.length} invoice`}
        />
      </div>

      <div className="card-surface mb-4">
        <FilterBar
          selects={[
            {
              name: 'status',
              label: 'Status',
              all: 'Semua status',
              value: query.status ?? '',
              options: INVOICE_STATUSES.map((s) => ({ value: s, label: s })),
            },
            {
              name: 'klien',
              label: 'Klien',
              all: 'Semua klien',
              value: query.clientId ?? '',
              options: clients.map((c) => ({ value: c.id, label: c.label })),
            },
          ]}
          dates={{
            from: query.from ?? '',
            to: query.to ?? '',
            fromLabel: 'Dari tanggal',
            toLabel: 'Sampai tanggal',
          }}
        />
      </div>

      <DataTable<InvoiceListItem>
        caption="Daftar invoice"
        columns={columns}
        rows={list.items}
        rowKey={(r) => r.id}
        page={list.page}
        pageSize={list.pageSize}
        total={list.total}
        basePath="/invoices"
        searchParams={params}
        empty={{
          title: 'Belum ada invoice',
          hint: 'Invoice dibuat dari tombol "Buat Invoice" dan terkait ke perkara atau klien.',
        }}
      />
    </div>
  );
}
