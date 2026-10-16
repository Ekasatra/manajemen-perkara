export type FigureItem = { label: string; value: string | number; note?: string };

/**
 * Strip angka pendukung dalam satu kartu (bukan deretan kartu statistik). Angka kunci memakai
 * serif; nilai selalu berasal dari data nyata yang diberikan pemanggil.
 */
export function FigureStrip({ label, items }: { label: string; items: FigureItem[] }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-card border border-navy-200 bg-white"
    >
      <dl className="grid divide-navy-100 max-sm:divide-y sm:grid-flow-col sm:auto-cols-fr sm:divide-x">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <dt className="text-sm text-navy-400">{item.label}</dt>
            <dd className="mt-1 font-display text-figure font-semibold lining-nums tabular-nums text-navy-700">
              {item.value}
            </dd>
            {item.note ? <p className="mt-0.5 text-xs text-navy-400">{item.note}</p> : null}
          </div>
        ))}
      </dl>
    </section>
  );
}
