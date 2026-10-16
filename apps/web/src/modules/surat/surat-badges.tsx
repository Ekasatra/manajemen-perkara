import { Badge } from '@/components/ui/badge';
import type { BadgeTone } from '@/components/ui/badge';

// Warna lencana surat mengikuti aplikasi GAS: sifat Segera oranye, Rahasia merah, status per tahap alur.
const SIFAT: Record<string, BadgeTone> = {
  Biasa: 'neutral',
  Penting: 'info',
  Segera: 'orange',
  Rahasia: 'danger',
};
const MASUK_STATUS: Record<string, BadgeTone> = {
  Belum: 'danger',
  Didisposisi: 'info',
  Selesai: 'success',
};
const KELUAR_STATUS: Record<string, BadgeTone> = {
  Draft: 'neutral',
  Review: 'info',
  Siap_TTD: 'warning',
  Ditandatangani: 'indigo',
  Terkirim: 'success',
};
const JENIS: Record<string, BadgeTone> = { Perkara: 'neutral', Instansi: 'gold' };

export const SifatBadge = ({ value }: { value: string }) => (
  <Badge tone={SIFAT[value] ?? 'neutral'}>{value}</Badge>
);
export const SuratMasukStatusBadge = ({ value }: { value: string }) => (
  <Badge tone={MASUK_STATUS[value] ?? 'neutral'}>{value}</Badge>
);
export const SuratKeluarStatusBadge = ({ value }: { value: string }) => (
  <Badge tone={KELUAR_STATUS[value] ?? 'neutral'}>{value.replace('_', ' ')}</Badge>
);
export const JenisBadge = ({ value }: { value: string }) => (
  <Badge tone={JENIS[value] ?? 'neutral'}>{value}</Badge>
);
