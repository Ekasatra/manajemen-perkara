import { describe, expect, it } from 'vitest';
import { formatNoAgenda, wibToday } from '../src/surat/masuk';

describe('penomoran & tanggal surat masuk', () => {
  it('format SM/{tahun}/{0001}', () => {
    expect(formatNoAgenda(2026, 1)).toBe('SM/2026/0001');
    expect(formatNoAgenda(2026, 12345)).toBe('SM/2026/12345');
  });

  it('tanggal & tahun mengikuti WIB, bukan UTC', () => {
    // 31 Des 2026 18:00 UTC = 1 Jan 2027 01:00 WIB
    expect(wibToday(new Date('2026-12-31T18:00:00Z'))).toEqual({ date: '2027-01-01', year: 2027 });
    expect(wibToday(new Date('2026-06-15T16:59:00Z'))).toEqual({ date: '2026-06-15', year: 2026 });
  });
});
