import type { ReactNode } from 'react';

/** Kartu kaca gaya GAS (`card-surface`): putih tembus, blur, sudut besar, bayangan lembut. */
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
    <section className={`card-surface p-5 ${className}`}>
      {title ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-navy-800">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
