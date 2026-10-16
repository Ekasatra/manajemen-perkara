import type { ReactNode } from 'react';

/** Visual mini untuk kartu KPI. SVG murni, warna dari token, makna selalu ada juga sebagai teks. */

export function Ring({ percent, label }: { percent: number; label: string }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div role="img" aria-label={label} className="relative size-12 shrink-0">
      <svg viewBox="0 0 48 48" className="size-12 -rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={r} fill="none" strokeWidth="3" className="stroke-navy-200" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(percent, 0), 100) / 100)}
          className="stroke-gold-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-navy-800">
        {percent}%
      </span>
    </div>
  );
}

export function MiniBars({
  bars,
  label,
}: {
  bars: { count: number; urgent?: boolean }[];
  label: string;
}) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  return (
    <div role="img" aria-label={label} className="flex h-10 items-end gap-1.5">
      {bars.map((b, i) => (
        <div
          key={i}
          style={{ height: `${Math.max((b.count / max) * 100, 8)}%` }}
          className={`w-2 rounded-t-control ${b.urgent && b.count > 0 ? 'bg-danger-fg' : 'bg-navy-300'}`}
        />
      ))}
    </div>
  );
}

export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? 60 / (values.length - 1) : 0;
  const points = values.map((v, i) => `${2 + i * step},${28 - (v / max) * 24}`).join(' ');
  const last = values.length - 1;
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 64 32"
      className="h-8 w-16 shrink-0"
      fill="none"
    >
      <polyline
        points={points}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-navy-700"
      />
      {last >= 0 ? (
        <circle
          cx={2 + last * step}
          cy={28 - ((values[last] ?? 0) / max) * 24}
          r="2.5"
          className="fill-gold-500"
        />
      ) : null}
    </svg>
  );
}

/** Kartu KPI: angka kunci serif di kiri, visual mini di kanan, rincian satu baris di bawah. */
export function KpiCard({
  label,
  value,
  note,
  visual,
  footer,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  note?: string;
  visual?: ReactNode;
  footer?: string[];
  tone?: 'default' | 'danger';
}) {
  return (
    <section className="flex flex-col justify-between rounded-card border border-navy-200 bg-surface p-5">
      <h2 className={`text-sm ${tone === 'danger' ? 'text-danger-fg' : 'text-navy-400'}`}>
        {label}
      </h2>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`font-display text-figure font-semibold lining-nums tabular-nums ${
              tone === 'danger' ? 'text-danger-fg' : 'text-navy-700'
            }`}
          >
            {value}
          </p>
          {note ? <p className="mt-1 text-sm text-navy-400">{note}</p> : null}
        </div>
        {visual}
      </div>
      {footer && footer.length > 0 ? (
        <ul className="mt-3 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-navy-100 pt-3 text-xs tabular-nums text-navy-400">
          {footer.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
