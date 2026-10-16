import type { ReactNode } from 'react';

export type BadgeTone =
  'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'orange' | 'fuchsia' | 'indigo' | 'gold';

// Palet status GAS: hijau aktif/lunas, amber putus/sebagian, oranye banding, rose kasasi,
// fuchsia PK, sky info, indigo ditandatangani. Gelap memakai latar semantik yang sudah teruji.
const TONE: Record<BadgeTone, string> = {
  neutral: 'bg-navy-100 text-navy-700',
  info: 'bg-sky-100 text-sky-700 dark:bg-navy-100 dark:text-navy-600',
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-danger-bg text-danger-fg',
  orange: 'bg-orange-100 text-orange-700 dark:bg-warning-bg dark:text-warning-fg',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-navy-100 dark:text-navy-600',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-navy-100 dark:text-navy-600',
  gold: 'bg-gold-100 text-gold-700',
};

/** Hanya untuk status nyata. Teks selalu tampil, jadi makna tidak bergantung pada warna. */
export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
