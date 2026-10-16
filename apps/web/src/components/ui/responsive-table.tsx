import type { ReactNode } from 'react';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'right';
};

/**
 * Tabel mobile-first: di bawah md tiap baris menjadi kartu (kolom pertama = judul kartu, sisanya
 * pasangan label dan nilai), dari md ke atas menjadi tabel biasa. Tanpa gulir horizontal.
 */
export function ResponsiveTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  const [head, ...rest] = columns;

  return (
    <>
      <ul aria-label={caption} className="divide-y divide-navy-100 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="px-4 py-3">
            {head ? <div className="font-medium text-navy-800">{head.cell(row)}</div> : null}
            {rest.length > 0 ? (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {rest.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-navy-400">{c.header}</dt>
                    <dd className="break-words text-navy-800 tabular-nums">{c.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm tabular-nums">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-navy-100 bg-navy-50/50 text-navy-400">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider ${c.align === 'right' ? 'text-right' : ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition hover:bg-gold-50/40">
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
    </>
  );
}
