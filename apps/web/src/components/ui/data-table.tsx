import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shell/states';
import { totalPages } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { ResponsiveTable } from './responsive-table';
import type { Column } from './responsive-table';
import { buttonClass } from './styles';

export type { Column };

type Props<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Halaman 1-based, ukuran halaman, dan total baris dari query server. */
  page: number;
  pageSize: number;
  total: number;
  /** Path halaman daftar; `searchParams` dipertahankan (filter) saat pindah halaman. */
  basePath: string;
  searchParams?: SearchParams;
  /** Tampilan saat `total` = 0: sebut penyebab dan aksi yang mengisinya. */
  empty: { title: string; hint?: string; action?: ReactNode };
};

function pageHref(basePath: string, params: SearchParams, page: number): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === 'page' || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v);
  }
  if (page > 1) qs.set('page', String(page));
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/**
 * Tabel generik dengan paginasi sisi server. Server component: navigasi halaman berupa
 * link `?page=N`, jadi tanpa state klien. Mobile-first lewat ResponsiveTable (kartu di bawah md).
 */
export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  page,
  pageSize,
  total,
  basePath,
  searchParams = {},
  empty,
}: Props<T>) {
  if (total === 0) {
    return (
      <div className="card-surface">
        <EmptyState {...empty} />
      </div>
    );
  }

  const pages = totalPages(total, pageSize);

  if (rows.length === 0) {
    return (
      <div className="card-surface">
        <EmptyState
          title="Halaman tidak ditemukan"
          hint={`Data hanya sampai halaman ${pages}.`}
          action={
            <Link href={pageHref(basePath, searchParams, 1)} className={buttonClass.secondary}>
              Ke halaman pertama
            </Link>
          }
        />
      </div>
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = from + rows.length - 1;

  return (
    <div className="overflow-hidden card-surface">
      <ResponsiveTable caption={caption} columns={columns} rows={rows} rowKey={rowKey} />

      <nav
        aria-label="Paginasi"
        className="flex flex-col gap-3 border-t border-navy-100 px-4 py-3 text-sm text-navy-600 sm:flex-row sm:items-center sm:justify-between"
      >
        <span>
          Menampilkan {from}–{to} dari {total}
        </span>
        <span className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(basePath, searchParams, page - 1)}
              className={buttonClass.secondary}
            >
              Sebelumnya
            </Link>
          ) : null}
          <span className="whitespace-nowrap">
            Halaman {page} dari {pages}
          </span>
          {page < pages ? (
            <Link
              href={pageHref(basePath, searchParams, page + 1)}
              className={buttonClass.secondary}
            >
              Berikutnya
            </Link>
          ) : null}
        </span>
      </nav>
    </div>
  );
}
