import type { ReactNode } from 'react';

/**
 * Daftar pasangan label dan nilai gaya GAS (label kapital kecil). `bare` tanpa kartu,
 * untuk dipakai di dalam kartu lain.
 */
export function FactList({ rows, bare = false }: { rows: [string, ReactNode][]; bare?: boolean }) {
  return (
    <dl className={`grid gap-x-6 gap-y-4 sm:grid-cols-2 ${bare ? '' : 'card-surface p-5'}`}>
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">
            {label}
          </dt>
          <dd className="mt-0.5 break-words text-sm text-navy-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
