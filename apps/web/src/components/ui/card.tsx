import type { ReactNode } from 'react';

/** Kartu datar bergaris 1 px: pemisahan tanpa bayangan (bayangan hanya untuk yang melayang). */
export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-navy-200 bg-surface p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base text-navy-800">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
