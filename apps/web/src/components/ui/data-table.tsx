import Link from 'next/link';
import type { ReactNode } from 'react';
import { EmptyState } from '@/shell/states';
import { totalPages } from '@/lib/pagination';
import type { SearchParams } from '@/lib/pagination';
import { buttonClass } from './styles';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
};

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
 * Tabel generik dengan paginasi sisi server (Agent A · A3). Server component:
 * navigasi halaman berupa link `?page=N`, jadi tanpa state klien.
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
  if (total === 0) return <EmptyState {...empty} />;

  const pages = totalPages(total, pageSize);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Halaman tidak ditemukan"
        hint={`Data hanya sampai halaman ${pages}.`}
        action={
          <Link href={pageHref(basePath, searchParams, 1)} className={buttonClass.secondary}>
            Ke halaman pertama
          </Link>
        }
      />
    );
  }

  const from = (page - 1) * pageSize + 1;
  const to = from + rows.length - 1;

  return (
    <div className="overflow-hidden rounded-card border border-navy-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-navy-200 bg-navy-50 text-navy-600">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-navy-50">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav
        aria-label="Paginasi"
        className="flex flex-wrap items-center justify-between gap-3 border-t border-navy-100 px-4 py-3 text-sm text-navy-600"
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
          <span>
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
