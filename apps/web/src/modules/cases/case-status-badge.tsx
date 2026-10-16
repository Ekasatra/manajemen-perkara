import type { CaseStatus } from '@ekasatra/shared/cases';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';

/** Warna status mengikuti aplikasi GAS: Aktif hijau, Putus amber, Banding oranye, Kasasi merah, PK fuchsia. */
const TONE: Record<CaseStatus, BadgeTone> = {
  Aktif: 'success',
  Putus: 'warning',
  Banding: 'orange',
  Kasasi: 'danger',
  PK: 'fuchsia',
  Selesai: 'neutral',
};

export function CaseStatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status as CaseStatus] ?? 'neutral'}>{status}</Badge>;
}
