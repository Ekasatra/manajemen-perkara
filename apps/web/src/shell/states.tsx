import type { ReactNode } from 'react';

/**
 * State UI standar (Agent A · A3): memuat, kosong, galat.
 * Setiap state menyebut penyebab dan langkah berikutnya lewat `hint`/`action`.
 */

export function LoadingState({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 p-8 text-navy-400">
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-navy-200 border-t-navy-600"
      />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-display text-xl font-semibold text-navy-800">{title}</p>
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
      <p className="font-display text-xl font-semibold text-navy-800">{title}</p>
      <p className="max-w-md text-sm text-navy-400">{message}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
