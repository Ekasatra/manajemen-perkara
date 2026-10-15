import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format';
import { parsePageQuery, totalPages } from '@/lib/pagination';

const plain = (s: string) => s.replace(/ /g, ' ');

describe('format', () => {
  it('rupiah memakai titik ribuan tanpa desimal', () => {
    expect(plain(formatRupiah(1_500_000))).toBe('Rp 1.500.000');
    expect(plain(formatRupiah(0))).toBe('Rp 0');
    expect(formatRupiah(null)).toBe('-');
  });

  it('rupiah menolak nilai pecahan', () => {
    expect(() => formatRupiah(100.5)).toThrow(RangeError);
  });

  it('tanggal ditampilkan dalam bahasa Indonesia, zona WIB', () => {
    expect(formatDate('2026-10-15')).toBe('15 Oktober 2026');
    // 2026-10-15T20:00Z = 16 Oktober 03.00 WIB
    expect(formatDateTime('2026-10-15T20:00:00Z')).toMatch(/16 Oktober 2026.*03[.:]00/);
    expect(formatDate(null)).toBe('-');
    expect(formatDate('bukan-tanggal')).toBe('-');
  });
});

describe('pagination', () => {
  it('memakai default dan menolak nilai tidak valid', () => {
    expect(parsePageQuery({})).toEqual({ page: 1, pageSize: 20, offset: 0 });
    expect(parsePageQuery({ page: '-3', pageSize: 'abc' })).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    });
    expect(parsePageQuery({ page: '1.5' }).page).toBe(1);
  });

  it('menghitung offset dan membatasi pageSize', () => {
    expect(parsePageQuery({ page: '3', pageSize: '10' })).toEqual({
      page: 3,
      pageSize: 10,
      offset: 20,
    });
    expect(parsePageQuery({ pageSize: '9999' }).pageSize).toBe(100);
    expect(parsePageQuery({ page: ['2', '5'] }).page).toBe(2);
  });

  it('jumlah halaman minimal 1', () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(41, 20)).toBe(3);
  });
});
