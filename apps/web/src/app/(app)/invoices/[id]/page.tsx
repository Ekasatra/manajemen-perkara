/**
 * Detail invoice + pembayaran (Agent F · F1–F2). Status dihitung dari paid_amount.
 */
import { notFound } from 'next/navigation';
import { ensureCan, isAppError } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { getInvoice } from '@ekasatra/core/invoices';
import { formatDate, formatRupiah } from '@/lib/format';
import { InvoiceActions } from '@/modules/invoices/invoice-actions';
import { pageContext } from '@/modules/invoices/route-ctx';
import { StatusBadge } from '@/modules/invoices/status-badge';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db, user } = await pageContext();
  ensureCan(user, 'R', 'invoices');

  let invoice;
  try {
    invoice = await getInvoice(db, user, uuidParam(id));
  } catch (e) {
    if (isAppError(e) && (e.code === 'NOT_FOUND' || e.code === 'VALIDATION_ERROR')) notFound();
    throw e;
  }

  const rows: [string, React.ReactNode][] = [
    ['Klien', invoice.clientName ?? '-'],
    ['Perkara', invoice.caseRegNo ? `${invoice.caseRegNo} · ${invoice.caseTitle}` : '-'],
    ['Tanggal invoice', formatDate(invoice.invoiceDate)],
    ['Jatuh tempo', formatDate(invoice.dueDate)],
    ['Jumlah', formatRupiah(invoice.amount)],
    ['Dibayar', formatRupiah(invoice.paidAmount)],
    ['Sisa', formatRupiah(Math.max(invoice.amount - invoice.paidAmount, 0))],
    ['Tanggal lunas', formatDate(invoice.paidDate)],
    ['Keterangan', invoice.description ?? '-'],
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-navy-700">{invoice.invoiceNo}</h1>
        <StatusBadge status={invoice.status} />
      </div>
      <dl className="mb-6 grid max-w-2xl grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-navy-500">{k}</dt>
            <dd className="text-navy-800">{v}</dd>
          </div>
        ))}
      </dl>
      <InvoiceActions
        id={invoice.id}
        invoiceNo={invoice.invoiceNo}
        amount={invoice.amount}
        paidAmount={invoice.paidAmount}
        dueDate={invoice.dueDate}
        description={invoice.description}
      />
    </div>
  );
}
