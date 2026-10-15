import { describe, expect, it } from 'vitest';
import {
  assertDraftEditable,
  honorState,
  planPublish,
  toMemberView,
  type HonorRow,
} from '../src/honor-tim';

const row = (userId: string, draft: number, over: Partial<HonorRow> = {}): HonorRow => ({
  userId,
  draftAmount: draft,
  publishedAmount: null,
  status: 'Belum',
  ...over,
});

const M = ['a', 'b', 'c'];

describe('planPublish (PRD §5.9)', () => {
  it('lolos bila semua terisi dan total tepat = dana', () => {
    const plan = planPublish(M, [row('a', 500), row('b', 300), row('c', 200)], 1000);
    expect(plan.issues).toEqual([]);
    expect(plan.total).toBe(1000);
  });

  it('nilai 0 sah', () => {
    expect(planPublish(M, [row('a', 0), row('b', 0), row('c', 0)], 0).issues).toEqual([]);
  });

  it('total melebihi dana 1 rupiah ditolak', () => {
    const plan = planPublish(M, [row('a', 500), row('b', 300), row('c', 201)], 1000);
    expect(plan.issues.map((i) => i.code)).toEqual(['OVER_FUND']);
  });

  it('anggota tanpa baris = belum terisi', () => {
    const plan = planPublish(M, [row('a', 500), row('b', 300)], 1000);
    expect(plan.issues).toEqual([expect.objectContaining({ code: 'MISSING', userId: 'c' })]);
  });

  it('nilai negatif / pecahan ditolak', () => {
    const neg = planPublish(['a'], [row('a', -1)], 1000);
    expect(neg.issues.map((i) => i.code)).toEqual(['INVALID']);
    const frac = planPublish(['a'], [row('a', 10.5)], 1000);
    expect(frac.issues.map((i) => i.code)).toEqual(['INVALID']);
  });

  it('baris milik non-anggota: dibuang bila belum dibayar, memblokir bila Dibayar', () => {
    const drop = planPublish(['a'], [row('a', 100), row('x', 50)], 1000);
    expect(drop.removeUserIds).toEqual(['x']);
    expect(drop.total).toBe(100); // honor non-anggota tidak ikut total
    const block = planPublish(['a'], [row('a', 100), row('x', 50, { status: 'Dibayar' })], 1000);
    expect(block.issues.map((i) => i.code)).toEqual(['STALE_PAID']);
  });
});

describe('honorState', () => {
  it('Draft: belum pernah dipublish', () => {
    expect(honorState(M, [], 1000)).toBe('Draft');
    expect(honorState(M, [row('a', 100)], 1000)).toBe('Draft');
  });

  it('Terdistribusi: semua anggota published = draft', () => {
    const rows = M.map((id) => row(id, 100, { publishedAmount: 100 }));
    expect(honorState(M, rows, 1000)).toBe('Terdistribusi');
  });

  it('Berubah: draft diedit setelah publish', () => {
    const rows = [
      row('a', 150, { publishedAmount: 100 }),
      row('b', 100, { publishedAmount: 100 }),
      row('c', 100, { publishedAmount: 100 }),
    ];
    expect(honorState(M, rows, 1000)).toBe('Berubah');
  });

  it('Berubah: anggota baru masuk tim setelah publish', () => {
    const rows = [row('a', 100, { publishedAmount: 100 })];
    expect(honorState(['a', 'b'], rows, 1000)).toBe('Berubah');
  });

  it('Berubah: anggota keluar tim tetapi barisnya masih ada', () => {
    const rows = [row('a', 100, { publishedAmount: 100 }), row('x', 50, { publishedAmount: 50 })];
    expect(honorState(['a'], rows, 1000)).toBe('Berubah');
  });

  it('Berubah: dana distribusi turun di bawah total published (invoice berkurang)', () => {
    const rows = M.map((id) => row(id, 100, { publishedAmount: 100 }));
    expect(honorState(M, rows, 299)).toBe('Berubah');
    expect(honorState(M, rows, 300)).toBe('Terdistribusi');
  });
});

describe('assertDraftEditable', () => {
  it('menolak penerima bukan anggota', () => {
    expect(() => assertDraftEditable(M, [], [{ userId: 'z', amount: 1 }])).toThrow(/bukan anggota/);
  });

  it('menolak mengubah honor yang sudah Dibayar, tetapi nilai sama boleh', () => {
    const rows = [row('a', 100, { publishedAmount: 100, status: 'Dibayar' })];
    expect(() => assertDraftEditable(M, rows, [{ userId: 'a', amount: 120 }])).toThrow(/Dibayar/);
    expect(() => assertDraftEditable(M, rows, [{ userId: 'a', amount: 100 }])).not.toThrow();
  });

  it('menolak nilai negatif', () => {
    expect(() => assertDraftEditable(M, [], [{ userId: 'a', amount: -5 }])).toThrow();
  });
});

describe('toMemberView — anggota hanya melihat yang dipublish', () => {
  it('draft yang belum dipublish tidak terlihat', () => {
    expect(toMemberView(row('a', 999))).toBeNull();
  });

  it('yang terlihat adalah published, bukan draft terbaru', () => {
    const v = toMemberView(row('a', 999, { publishedAmount: 100 }));
    expect(v).toEqual({ amount: 100, status: 'Belum' });
    expect(JSON.stringify(v)).not.toContain('999');
  });
});
