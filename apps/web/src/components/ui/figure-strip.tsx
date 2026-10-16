export type FigureItem = { label: string; value: string | number; note?: string };

/**
 * Strip angka pendukung dalam satu kartu (bukan deretan kartu statistik). Angka memakai sans
 * semibold; nilai selalu berasal dari data nyata yang diberikan pemanggil.
 */
export function FigureStrip({ label, items }: { label: string; items: FigureItem[] }) {
  return (
    <section aria-label={label} className="overflow-hidden card-surface">
      <dl className="grid divide-navy-100 max-sm:divide-y sm:grid-flow-col sm:auto-cols-fr sm:divide-x">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
              {item.label}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums text-navy-800">{item.value}</dd>
            {item.note ? <p className="mt-0.5 text-xs text-navy-400">{item.note}</p> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
