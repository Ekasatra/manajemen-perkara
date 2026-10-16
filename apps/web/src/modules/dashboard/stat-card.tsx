import Link from 'next/link';
import type { ReactNode } from 'react';

export type StatTone = 'navy' | 'slate' | 'gold' | 'sky' | 'emerald' | 'indigo' | 'rose' | 'amber';

// Warna ikon kartu statistik gaya GAS; di tema gelap memakai latar semantik yang sudah teruji kontrasnya.
const TONE: Record<StatTone, string> = {
  navy: 'bg-navy-50 text-navy-700',
  slate: 'bg-navy-100 text-navy-500',
  gold: 'bg-gold-50 text-gold-600',
  sky: 'bg-sky-50 text-sky-600 dark:bg-navy-100 dark:text-navy-600',
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-success-bg dark:text-success-fg',
  indigo: 'bg-indigo-50 text-indigo-600 dark:bg-navy-100 dark:text-navy-600',
  rose: 'bg-rose-50 text-rose-600 dark:bg-danger-bg dark:text-danger-fg',
  amber: 'bg-amber-50 text-amber-600 dark:bg-warning-bg dark:text-warning-fg',
};

export function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  tone: StatTone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-navy-400">{label}</span>
        <span aria-hidden="true" className={`flex size-9 items-center justify-center rounded-control ${TONE[tone]}`}>
          {icon}
        </span>
      </div>
      <div className="text-[28px] font-bold leading-none text-navy-800">{value}</div>
      <div className="text-xs text-navy-400">{sub}</div>
    </>
  );
  const cls = 'card-surface relative flex flex-col gap-2 overflow-hidden p-4';
  return href ? (
    <Link href={href} className={`${cls} transition hover:-translate-y-0.5`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
