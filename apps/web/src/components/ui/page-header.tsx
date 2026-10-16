import type { ReactNode } from 'react';

/** Kepala halaman gaya GAS: judul serif besar, deskripsi, dan aksi utama di kanan. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold text-navy-800">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-navy-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
