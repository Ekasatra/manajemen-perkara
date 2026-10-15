/** Angka → kata bahasa Indonesia untuk kuitansi: 1500000 → "satu juta lima ratus ribu". */
const SATUAN = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
];

function below1000(n: number): string {
  if (n < 12) return SATUAN[n] ?? '';
  if (n < 20) return `${SATUAN[n - 10]} belas`;
  if (n < 100) return `${SATUAN[Math.floor(n / 10)]} puluh ${below1000(n % 10)}`.trim();
  if (n < 200) return `seratus ${below1000(n - 100)}`.trim();
  return `${SATUAN[Math.floor(n / 100)]} ratus ${below1000(n % 100)}`.trim();
}

const SKALA: [number, string][] = [
  [1_000_000_000_000, 'triliun'],
  [1_000_000_000, 'miliar'],
  [1_000_000, 'juta'],
  [1_000, 'ribu'],
];

export function terbilang(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`terbilang butuh integer ≥ 0, diterima: ${value}`);
  }
  if (value === 0) return 'nol';
  let rest = value;
  const parts: string[] = [];
  for (const [unit, name] of SKALA) {
    const chunk = Math.floor(rest / unit);
    if (chunk === 0) continue;
    // "seribu" bukan "satu ribu"; juta/miliar/triliun tetap "satu juta".
    parts.push(unit === 1_000 && chunk === 1 ? 'seribu' : `${terbilang(chunk)} ${name}`);
    rest %= unit;
  }
  if (rest > 0) parts.push(below1000(rest));
  return parts.join(' ');
}
