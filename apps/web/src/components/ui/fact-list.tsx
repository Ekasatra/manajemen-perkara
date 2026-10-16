import type { ReactNode } from 'react';

/** Daftar pasangan label dan nilai dalam satu kartu bergaris (detail surat, invoice). */
export function FactList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 rounded-card border border-navy-200 bg-surface p-5 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-navy-400">{label}</dt>
          <dd className="mt-0.5 break-words text-sm text-navy-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
