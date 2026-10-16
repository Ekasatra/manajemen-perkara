/**
 * Grafik batang dari div + token. Semua warna dari token; tiap segmen punya label teks
 * dan angka di legenda, jadi makna tidak hanya lewat warna (R-25).
 */

/** Warna segmen per status perkara. Status tak dikenal memakai FALLBACK. */
const STATUS_FILL: Record<string, string> = {
  Aktif: 'bg-navy-700',
  Selesai: 'bg-success-fg',
  Tutup: 'bg-navy-300',
  Banding: 'bg-gold-500',
  Kasasi: 'bg-gold-700',
  PK: 'bg-navy-400',
};
const STATUS_FILL_FALLBACK = 'bg-navy-200';

export function CasesStatusChart({
  byStatus,
}: {
  byStatus: { status: string; count: number }[];
}) {
  const total = byStatus.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return (
      <p className="flex h-32 items-center justify-center text-sm text-navy-400">
        Belum ada perkara tercatat.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-3 w-full gap-px overflow-hidden rounded-control bg-navy-100">
        {byStatus.map((item) =>
          item.count === 0 ? null : (
            <div
              key={item.status}
              style={{ width: `${(item.count / total) * 100}%` }}
              className={`h-full ${STATUS_FILL[item.status] ?? STATUS_FILL_FALLBACK}`}
            />
          ),
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {byStatus.map((item) => (
          <li key={item.status} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`size-3 shrink-0 rounded-control ${STATUS_FILL[item.status] ?? STATUS_FILL_FALLBACK}`}
            />
            <span className="text-navy-700">{item.status}</span>
            <span className="ml-auto font-medium tabular-nums text-navy-800">
              {item.count}{' '}
              <span className="font-normal text-navy-400">
                ({Math.round((item.count / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SuratTrendChart({
  trend6Bulan,
}: {
  trend6Bulan: { month: string; suratMasuk: number; suratKeluar: number }[];
}) {
  const maxVal = Math.max(1, ...trend6Bulan.map((t) => Math.max(t.suratMasuk, t.suratKeluar)));

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex items-center justify-end gap-4 text-xs text-navy-700">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-control bg-navy-700" />
          Surat masuk
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-control bg-gold-500" />
          Surat keluar
        </li>
      </ul>

      <div className="flex gap-3 border-b border-navy-200 pb-2">
        {trend6Bulan.map((item) => (
          <div key={item.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div
                style={{ height: `${(item.suratMasuk / maxVal) * 100}%` }}
                className="min-h-px w-full max-w-4 rounded-t-control bg-navy-700"
              />
              <div
                style={{ height: `${(item.suratKeluar / maxVal) * 100}%` }}
                className="min-h-px w-full max-w-4 rounded-t-control bg-gold-500"
              />
            </div>
            <span className="text-xs font-medium text-navy-700">{item.month}</span>
            <span className="text-xs tabular-nums text-navy-400">
              {item.suratMasuk} / {item.suratKeluar}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
