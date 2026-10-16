import type { ReactNode } from 'react';

/**
 * Kepala halaman: judul serif, deskripsi, aksi utama, dan motif identitas (garis ganda emas
 * tipis ala kop surat). Motif hanya muncul di sini, tidak diulang di kartu.
 */
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
          <h1 className="text-title font-semibold text-navy-700">{title}</h1>
          {description ? <p className="mt-1 max-w-2xl text-sm text-navy-400">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div aria-hidden="true" className="mt-4">
        <div className="h-px w-full bg-gold-500" />
        <div className="mt-0.5 h-px w-16 bg-gold-500" />
      </div>
    </header>
  );
}
