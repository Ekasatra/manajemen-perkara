import { describe, expect, it } from 'vitest';
import {
  distributableFund,
  formatDocNo,
  kasShare,
  percentToBps,
  terbilang,
  todayWIB,
} from '../src/finance';

describe('kasShare — pembulatan persen (PRD §5.9)', () => {
  it('persen default 20% dari total bulat', () => {
    expect(kasShare(10_000_000, 20)).toBe(2_000_000);
  });

  it('half-up pada persen pecahan: 12,5% × 1.005 = 125,625 → 126', () => {
    expect(kasShare(1_005, 12.5)).toBe(126);
  });

  it('tepat setengah dibulatkan ke atas, bukan ke genap: 50% × 1 = 0,5 → 1', () => {
    expect(kasShare(1, 50)).toBe(1);
    expect(kasShare(3, 50)).toBe(2); // 1,5 → 2
    expect(kasShare(5, 50)).toBe(3); // 2,5 → 3 (banker's rounding akan memberi 2)
  });

  it('di bawah setengah dibulatkan ke bawah: 20% × 7 = 1,4 → 1', () => {
    expect(kasShare(7, 20)).toBe(1);
  });

  it('0% dan 100%', () => {
    expect(kasShare(123_456_789, 0)).toBe(0);
    expect(kasShare(123_456_789, 100)).toBe(123_456_789);
  });

  it('total 0 → kas 0', () => {
    expect(kasShare(0, 20)).toBe(0);
  });

  it('eksak untuk total mendekati batas integer aman (float akan meleset)', () => {
    const total = 9_007_199_254_740_991; // 2^53 − 1
    expect(kasShare(total, 100)).toBe(total);
    expect(kasShare(total, 50)).toBe(4_503_599_627_370_496); // half-up dari ...495,5
    // 33,33% memakai BigInt: bandingkan dengan hitungan BigInt langsung
    expect(kasShare(total, 33.33)).toBe(Number((BigInt(total) * 3333n + 5000n) / 10000n));
  });

  it('kas + dana selalu = total untuk kombinasi total × persen', () => {
    const totals = [0, 1, 2, 3, 7, 99, 100, 101, 999, 1_005, 12_345_678, 1_000_000_007];
    const persen = [0, 0.01, 0.5, 5, 12.5, 16.67, 20, 33.33, 50, 99.99, 100];
    for (const t of totals) {
      for (const p of persen) {
        const kas = kasShare(t, p);
        expect(Number.isInteger(kas)).toBe(true);
        expect(kas).toBeGreaterThanOrEqual(0);
        expect(kas).toBeLessThanOrEqual(t);
        expect(kas + distributableFund(t, p)).toBe(t);
      }
    }
  });

  it('menolak persen di luar 0–100 dan total bukan integer/negatif', () => {
    expect(() => kasShare(100, -1)).toThrow();
    expect(() => kasShare(100, 100.01)).toThrow();
    expect(() => kasShare(100, Number.NaN)).toThrow();
    expect(() => kasShare(100.5, 20)).toThrow();
    expect(() => kasShare(-1, 20)).toThrow();
    expect(() => kasShare(2 ** 53, 20)).toThrow();
  });
});

describe('percentToBps', () => {
  it('2 desimal presisi, tahan artefak float', () => {
    expect(percentToBps(20)).toBe(2000);
    expect(percentToBps(12.5)).toBe(1250);
    expect(percentToBps(1.005)).toBe(101); // 1,005 × 100 = 100,49999… di float
    expect(percentToBps(0.29)).toBe(29); // 0,29 × 100 = 28,999… di float
  });
});

describe('todayWIB', () => {
  it('pakai tanggal WIB (UTC+7), bukan UTC', () => {
    expect(todayWIB(new Date('2026-12-31T17:30:00Z'))).toBe('2027-01-01');
    expect(todayWIB(new Date('2026-12-31T16:59:00Z'))).toBe('2026-12-31');
  });
});

describe('formatDocNo', () => {
  it('INV/{tahun}/{0001}', () => {
    expect(formatDocNo('INV', 2026, 1)).toBe('INV/2026/0001');
    expect(formatDocNo('INV', 2026, 12345)).toBe('INV/2026/12345');
  });
});

describe('terbilang', () => {
  it.each([
    [0, 'nol'],
    [1, 'satu'],
    [11, 'sebelas'],
    [15, 'lima belas'],
    [20, 'dua puluh'],
    [101, 'seratus satu'],
    [1_000, 'seribu'],
    [1_500, 'seribu lima ratus'],
    [2_000, 'dua ribu'],
    [11_000, 'sebelas ribu'],
    [100_000, 'seratus ribu'],
    [1_000_000, 'satu juta'],
    [2_500_000, 'dua juta lima ratus ribu'],
    [1_234_567, 'satu juta dua ratus tiga puluh empat ribu lima ratus enam puluh tujuh'],
    [1_000_000_000, 'satu miliar'],
  ])('%i → %s', (n, words) => {
    expect(terbilang(n)).toBe(words);
  });

  it('menolak negatif / pecahan', () => {
    expect(() => terbilang(-1)).toThrow();
    expect(() => terbilang(1.5)).toThrow();
  });
});
