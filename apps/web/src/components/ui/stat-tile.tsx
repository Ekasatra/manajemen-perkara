import type { ReactNode } from 'react';

/** Kartu angka sederhana gaya GAS (`.stat`): label kapital kecil, angka, keterangan. */
export function StatTile({
  label,
  value,
  note,
  tone = 'default',
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: 'default' | 'success' | 'gold' | 'danger';
}) {
  const color = {
    default: 'text-navy-800',
    success: 'text-success-fg',
    gold: 'text-gold-700',
    danger: 'text-danger-fg',
  }[tone];
  return (
    <div className="card-surface flex flex-col gap-2 p-4">
      <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</span>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
      {note ? <div className="text-xs text-navy-400">{note}</div> : null}
    </div>
  );
}
