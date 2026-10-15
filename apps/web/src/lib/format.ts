/**
 * Formatter tampilan (Agent A · A3). Tanggal disimpan ISO/UTC, ditampilkan WIB (PRD §7).
 * Uang = integer rupiah; nilai pecahan dianggap bug pemanggil, bukan dibulatkan diam-diam.
 */
const TZ = 'Asia/Jakarta';

const dateFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const dateTimeFmt = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const rupiahFmt = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

type DateInput = string | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "15 Oktober 2026"; `-` bila kosong/tidak valid. */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  return d ? dateFmt.format(d) : '-';
}

/** "15 Oktober 2026 16.45" (WIB); `-` bila kosong/tidak valid. */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : '-';
}

/** "Rp 1.500.000"; `-` bila null/undefined. Melempar RangeError untuk nilai bukan integer. */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount == null) return '-';
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Nominal rupiah harus integer, diterima: ${amount}`);
  }
  return rupiahFmt.format(amount);
}
