/** Blok placeholder statis (tanpa animasi): ukuran tetap agar tata letak tidak bergeser. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-control bg-navy-100 ${className}`} />;
}

/** Kerangka halaman daftar: kepala + tabel. Dipakai `loading.tsx`. */
export function PageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat halaman…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-6 rounded-card border border-navy-200 bg-surface p-4">
        <Skeleton className="h-9 w-full" />
        <div className="mt-3 flex flex-col gap-3">
          {Array.from({ length: rows }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
