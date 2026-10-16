/**
 * Grafik gaya GAS tanpa pustaka: donat (perkara per status) dan batang berkelompok (surat 6 bulan).
 * Warna dari token sehingga ikut berganti di tema gelap; tiap data punya label teks/angka (R-25).
 */
const SLICE_STROKE = [
  'stroke-navy-700',
  'stroke-gold-500',
  'stroke-navy-500',
  'stroke-gold-300',
  'stroke-navy-300',
  'stroke-navy-200',
] as const;
const SLICE_FILL = [
  'bg-navy-700',
  'bg-gold-500',
  'bg-navy-500',
  'bg-gold-300',
  'bg-navy-300',
  'bg-navy-200',
] as const;

const R = 40;
const CIRC = 2 * Math.PI * R;

export function StatusDonut({ byStatus }: { byStatus: { status: string; count: number }[] }) {
  const items = byStatus.filter((s) => s.count > 0);
  const total = items.reduce((n, s) => n + s.count, 0);
  if (total === 0) {
    return (
      <p className="flex h-60 items-center justify-center text-sm text-navy-400">
        Belum ada perkara tercatat.
      </p>
    );
  }
  // Awal tiap irisan = jumlah panjang irisan sebelumnya (dihitung murni, tanpa mengubah variabel saat render).
  const lens = items.map((s) => (s.count / total) * CIRC);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((n, v) => n + v, 0));
  return (
    <div className="flex h-60 items-center gap-6">
      <svg viewBox="0 0 100 100" role="img" aria-label={`Perkara per status, total ${total}`} className="h-full max-h-56 shrink-0">
        <g transform="rotate(-90 50 50)">
          {items.map((s, i) => (
            <circle
              key={s.status}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              strokeWidth="14"
              strokeDasharray={`${lens[i]} ${CIRC - (lens[i] ?? 0)}`}
              strokeDashoffset={-(starts[i] ?? 0)}
              className={SLICE_STROKE[i % SLICE_STROKE.length]}
            />
          ))}
        </g>
        <text x="50" y="52" textAnchor="middle" className="fill-navy-800 text-[14px] font-bold">
          {total}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-2 text-xs">
        {items.map((s, i) => (
          <li key={s.status} className="flex items-center gap-2">
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-sm ${SLICE_FILL[i % SLICE_FILL.length]}`} />
            <span className="text-navy-700">{s.status}</span>
            <span className="ml-auto font-semibold tabular-nums text-navy-800">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Field `month` berisi label seperti "Okt 2026"; grafik hanya menampilkan nama bulannya. */
function monthLabel(m: string): string {
  return m.split(' ')[0] ?? m;
}

export function MailBars({
  trend,
}: {
  trend: { month: string; suratMasuk: number; suratKeluar: number }[];
}) {
  const max = Math.max(4, ...trend.flatMap((t) => [t.suratMasuk, t.suratKeluar]));
  const ticks = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0];
  return (
    <div>
      <div className="mb-2 flex justify-center gap-4 text-[11px] text-navy-600">
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-navy-700" />Masuk</span>
        <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-2.5 rounded-sm bg-gold-500" />Keluar</span>
      </div>
      <div className="flex h-52 gap-2">
        <div className="flex flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-navy-400">
          {ticks.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
        <ul className="flex flex-1 items-end justify-between gap-2 border-l border-navy-100 pl-2">
          {trend.map((t) => (
            <li key={t.month} className="flex h-full flex-1 flex-col items-center justify-end">
              <div className="flex h-[calc(100%-1.5rem)] w-full items-end justify-center gap-1">
                <div
                  title={`Masuk ${t.suratMasuk}`}
                  style={{ height: `${(t.suratMasuk / max) * 100}%` }}
                  className="w-1/2 max-w-5 rounded-t-md bg-navy-700"
                />
                <div
                  title={`Keluar ${t.suratKeluar}`}
                  style={{ height: `${(t.suratKeluar / max) * 100}%` }}
                  className="w-1/2 max-w-5 rounded-t-md bg-gold-500"
                />
              </div>
              <span className="mt-1.5 text-[11px] text-navy-400">
                {monthLabel(t.month)}
                <span className="sr-only">
                  : masuk {t.suratMasuk}, keluar {t.suratKeluar}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
