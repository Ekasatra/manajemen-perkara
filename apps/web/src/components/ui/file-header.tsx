import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { buttonClass } from './styles';

export type Fact = { label: string; value: ReactNode };

/**
 * Kepala berkas untuk halaman detail: rujukan (nomor), judul serif, status, dan fakta penentu
 * dalam satu blok. Gaya mengikuti PageHeader (judul serif besar, tanpa garis hias).
 */
export function FileHeader({
  back,
  reference,
  title,
  status,
  facts,
  actions,
}: {
  back: { href: string; label: string };
  /** Nomor yang mengidentifikasi berkas, mis. nomor registrasi atau nomor invoice. */
  reference?: string;
  title: string;
  status?: ReactNode;
  facts?: Fact[];
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      <Link href={back.href} className={`${buttonClass.ghost} -ml-3 mb-2`}>
        <ChevronLeft aria-hidden="true" size={16} />
        {back.label}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {reference || status ? (
            <div className="mb-1 flex flex-wrap items-center gap-2 text-sm text-navy-400">
              {reference ? <span className="tabular-nums">{reference}</span> : null}
              {status}
            </div>
          ) : null}
          <h1 className="font-display text-2xl font-semibold text-navy-800">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {facts && facts.length > 0 ? (
        <dl className="card-surface mt-4 grid p-5 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="min-w-0">
              <dt className="text-xs text-navy-400">{f.label}</dt>
              <dd className="mt-0.5 text-sm font-medium text-navy-800">{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
