/**
 * Detail invoice + pembayaran (Agent F · F1–F2). Status dihitung dari paid_amount.
 */
import { notFound } from 'next/navigation';
import { ensureCan, isAppError } from '@ekasatra/core';
import { uuidParam } from '@ekasatra/core/finance';
import { getInvoice } from '@ekasatra/core/invoices';
import { FactList } from '@/components/ui/fact-list';
import { FileHeader } from '@/components/ui/file-header';
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
      <FileHeader
        back={{ href: '/invoices', label: 'Invoice' }}
        reference="Nomor invoice"
        status={<StatusBadge status={invoice.status} />}
        title={invoice.invoiceNo}
      />
      <div className="mb-6">
        <FactList rows={rows} />
      </div>
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
