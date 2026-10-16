import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * State UI standar: memuat, kosong, galat.
 * Setiap state menyebut penyebab dan langkah berikutnya lewat `hint`/`action`.
 */

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3 p-6">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-2/3" />
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Ikon relevan dengan isi (mis. `<Scale />`); dekoratif, disembunyikan dari pembaca layar. */
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      {icon ? (
        <span aria-hidden="true" className="text-navy-300">
          {icon}
        </span>
      ) : null}
      <p className="text-base font-semibold text-navy-800">{title}</p>
      {hint ? <p className="max-w-md text-sm text-navy-400">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Terjadi kesalahan',
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="text-base font-semibold text-navy-800">{title}</p>
      <p className="max-w-md text-sm text-navy-400">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
