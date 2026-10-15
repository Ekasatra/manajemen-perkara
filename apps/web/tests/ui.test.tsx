import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTable } from '@/components/ui/data-table';

const base = {
  caption: 'Daftar uji',
  columns: [{ key: 'n', header: 'Nama', cell: (r: { n: string }) => r.n }],
  rowKey: (r: { n: string }) => r.n,
  pageSize: 2,
  basePath: '/uji',
  empty: { title: 'Belum ada data', hint: 'Tambahkan data pertama.' },
};

describe('DataTable', () => {
  it('menampilkan state kosong saat total 0', () => {
    const html = renderToStaticMarkup(<DataTable {...base} rows={[]} page={1} total={0} />);
    expect(html).toContain('Belum ada data');
    expect(html).not.toContain('<table');
  });

  it('paginasi mempertahankan filter dan hanya menampilkan tautan yang valid', () => {
    const html = renderToStaticMarkup(
      <DataTable
        {...base}
        rows={[{ n: 'c' }, { n: 'd' }]}
        page={2}
        total={5}
        searchParams={{ q: 'abc', page: '2' }}
      />,
    );
    expect(html).toContain('Menampilkan 3–4 dari 5');
    expect(html).toContain('href="/uji?q=abc"'); // sebelumnya = halaman 1 tanpa ?page
    expect(html).toContain('href="/uji?q=abc&amp;page=3"');
  });

  it('halaman melebihi batas diarahkan kembali ke halaman pertama', () => {
    const html = renderToStaticMarkup(<DataTable {...base} rows={[]} page={9} total={5} />);
    expect(html).toContain('Halaman tidak ditemukan');
    expect(html).toContain('href="/uji"');
  });
});
