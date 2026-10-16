/**
 * Daftar invoice / biaya perkara (Agent F · F1). Admin saja (PRD §4).
 */
import Link from 'next/link';
import { ensureCan } from '@ekasatra/core';
import { listCaseOptions, listClientOptions } from '@ekasatra/core/finance';
import { listInvoices, type InvoiceListItem } from '@ekasatra/core/invoices';
import { INVOICE_STATUSES, listInvoicesQuerySchema } from '@ekasatra/shared/invoices';
import { DataTable, type Column } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { buttonClass, inputClass, labelClass } from '@/components/ui/styles';
import { formatDate, formatRupiah } from '@/lib/format';
import type { SearchParams } from '@/lib/pagination';
import { CreateInvoiceDialog } from '@/modules/invoices/create-invoice-dialog';
import { pageContext } from '@/modules/invoices/route-ctx';
import { StatusBadge } from '@/modules/invoices/status-badge';

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { db, user } = await pageContext();
  ensureCan(user, 'R', 'invoices');

  const params = await searchParams;
  const parsed = listInvoicesQuerySchema.safeParse({
    status: first(params.status) || undefined,
    page: first(params.page),
  });
  const query = parsed.success ? parsed.data : listInvoicesQuerySchema.parse({});

  const [list, clients, cases] = await Promise.all([
    listInvoices(db, user, query),
    listClientOptions(db),
    listCaseOptions(db),
  ]);

  const columns: Column<InvoiceListItem>[] = [
    {
      key: 'invoiceNo',
      header: 'No. Invoice',
      cell: (r) => (
        <Link href={`/invoices/${r.id}`} className="font-medium text-navy-700 underline">
          {r.invoiceNo}
        </Link>
      ),
    },
    { key: 'invoiceDate', header: 'Tanggal', cell: (r) => formatDate(r.invoiceDate) },
    { key: 'client', header: 'Klien', cell: (r) => r.clientName ?? '-' },
    { key: 'case', header: 'Perkara', cell: (r) => r.caseRegNo ?? '-' },
    { key: 'amount', header: 'Jumlah', align: 'right', cell: (r) => formatRupiah(r.amount) },
    { key: 'paid', header: 'Dibayar', align: 'right', cell: (r) => formatRupiah(r.paidAmount) },
    { key: 'status', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { key: 'due', header: 'Jatuh tempo', cell: (r) => formatDate(r.dueDate) },
  ];

  return (
    <div>
      <PageHeader
        title="Invoice"
        description="Biaya perkara: tagihan, pembayaran, dan jatuh tempo."
        actions={<CreateInvoiceDialog clients={clients} cases={cases} />}
      />

      <form method="get" className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="f-status" className={labelClass}>
            Status
          </label>
          <select
            id="f-status"
            name="status"
            defaultValue={query.status ?? ''}
            className={inputClass}
          >
            <option value="">Semua</option>
            {INVOICE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={buttonClass.secondary}>
          Terapkan
        </button>
      </form>

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
