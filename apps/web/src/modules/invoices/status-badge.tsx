import type { InvoiceStatus } from '@ekasatra/shared/invoices';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';

const TONE: Record<InvoiceStatus, BadgeTone> = {
  'Belum Bayar': 'danger',
  'Sudah Bayar Sebagian': 'warning',
  Lunas: 'success',
};

/** Teks selalu tampil (bukan hanya warna) agar terbaca tanpa membedakan warna. */
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={TONE[status]}>{status}</Badge>;
}
