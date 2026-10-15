/**
 * Aritmetika uang & tanggal keuangan (Agent F). Uang = integer rupiah; tidak ada float.
 * Perkalian persen memakai BigInt agar tetap eksak untuk total mendekati 2^53.
 */
import { validationError } from '@ekasatra/shared';

const BPS_FULL = 10_000n; // 100% = 10.000 basis point (1 bps = 0,01%)

/** Pastikan `value` integer rupiah aman (≥ 0). */
export function assertRupiah(value: number, label = 'Nominal'): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw validationError(`${label} harus bilangan bulat rupiah ≥ 0`);
  }
}

/**
 * Persen → basis point integer (20 → 2000, 12,5 → 1250). Presisi 2 desimal; lebih halus dibulatkan.
 * Di luar 0–100 → error (setting rusak tidak boleh menghasilkan kas negatif / > total).
 */
export function percentToBps(persen: number): number {
  if (!Number.isFinite(persen) || persen < 0 || persen > 100) {
    throw validationError('Persentase kas harus antara 0 dan 100');
  }
  return Math.round(Number((persen * 100).toFixed(6)));
}

/**
 * Bagian kas kantor = total × persen, dibulatkan setengah-ke-atas ke rupiah (PRD §5.9).
 * Dihitung per perkara; jumlah kas kantor = jumlah kas per perkara (bukan pembulatan dari jumlah total).
 */
export function kasShare(total: number, persen: number): number {
  assertRupiah(total, 'Total biaya perkara');
  const bps = BigInt(percentToBps(persen));
  return Number((BigInt(total) * bps + BPS_FULL / 2n) / BPS_FULL);
}

/** Dana distribusi honor = total − kas. Selalu `kas + dana === total`. */
export function distributableFund(total: number, persen: number): number {
  return total - kasShare(total, persen);
}

const TZ = 'Asia/Jakarta';
const ymd = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Tanggal hari ini menurut WIB, `YYYY-MM-DD`. */
export function todayWIB(now: Date = new Date()): string {
  return ymd.format(now);
}

/** Nomor dokumen `PREFIX/{tahun}/{0001}`; tahun dari tanggal WIB. */
export function formatDocNo(prefix: string, year: number, seq: number): string {
  return `${prefix}/${year}/${String(seq).padStart(4, '0')}`;
}
