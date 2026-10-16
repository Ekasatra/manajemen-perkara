import type { CaseStatus } from '@ekasatra/shared/cases';
import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';

/** Upaya hukum lanjutan (Banding, Kasasi, PK) berarti perkara masih menunggu: nada peringatan. */
const TONE: Record<CaseStatus, BadgeTone> = {
  Aktif: 'info',
  Putus: 'warning',
  Banding: 'warning',
  Kasasi: 'warning',
  PK: 'warning',
  Selesai: 'success',
};

export function CaseStatusBadge({ status }: { status: string }) {
  return <Badge tone={TONE[status as CaseStatus] ?? 'neutral'}>{status}</Badge>;
}
