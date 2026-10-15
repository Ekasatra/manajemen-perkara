import type { InvoiceStatus } from '@ekasatra/shared/invoices';

const TONE: Record<InvoiceStatus, string> = {
  'Belum Bayar': 'bg-red-50 text-red-800 ring-red-200',
  Sebagian: 'bg-amber-50 text-amber-900 ring-amber-200',
  Lunas: 'bg-green-50 text-green-800 ring-green-200',
};

/** Teks selalu tampil (bukan hanya warna) agar terbaca tanpa membedakan warna. */
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE[status]}`}
    >
      {status}
    </span>
  );
}
