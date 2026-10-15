/**
 * Tes D7 — logika cakupan visibilitas perkara (PRD §4 "Pembatasan baris").
 * Satu-satunya tempat aturan ini diterapkan: `listVisibleCaseIds` / `getCaseForUser`.
 *
 * Mock DB memakai rantai builder Drizzle minimal (pola dashboard.test.ts) agar
 * logika cakupan bisa diuji tanpa Postgres. Tabel diidentifikasi lewat referensi
 * objek (bukan nama internal) untuk akurasi.
 */
import { describe, expect, it, vi } from 'vitest';
import { cases, caseMembers } from '@ekasatra/db';
import { listVisibleCaseIds, getCaseForUser } from '../src/cases/read';

function makeChain(result: unknown = []) {
  const p = Promise.resolve(result);
  const chain: Record<string, unknown> = {
    then: p.then.bind(p),
    catch: p.catch.bind(p),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
  };
  return chain;
}

/** Mock DB yang memetakan referensi objek tabel → hasil query. */
function makeMockDb(results: Map<object, unknown>) {
  const selectFn = vi.fn(() => ({
    from: vi.fn((table: object) => makeChain(results.get(table) ?? [])),
  }));
  return { select: selectFn } as unknown as Parameters<typeof listVisibleCaseIds>[0];
}

const CASE_ROW = {
  id: 'c1',
  regNo: 'REG/2026/0001',
  title: 'Perkara A',
  clientId: 'cl-1',
  status: 'Aktif',
  court: null,
  caseNumber: null,
};

describe('listVisibleCaseIds — cakupan (PRD §4)', () => {
  it('Admin → "all" (lihat semua perkara)', async () => {
    const db = makeMockDb(new Map());
    const result = await listVisibleCaseIds(db, 'user-admin', 'admin', true);
    expect(result).toBe('all');
  });

  it('Admin mengabaikan scope_assigned_only', async () => {
    const db = makeMockDb(new Map());
    const result = await listVisibleCaseIds(db, 'user-admin', 'Admin', false);
    expect(result).toBe('all');
  });

  it('non-Admin + scope_assigned_only=false → "all"', async () => {
    const db = makeMockDb(new Map());
    const result = await listVisibleCaseIds(db, 'user-adv', 'advokat', false);
    expect(result).toBe('all');
  });

  it('non-Admin + scope=true → ID perkara miliknya + tim', async () => {
    const results = new Map<object, unknown>([
      [cases, [{ id: 'case-owned' }]],
      [caseMembers, [{ id: 'case-team' }]], // select caseId as id
    ]);
    const db = makeMockDb(results);
    const result = await listVisibleCaseIds(db, 'user-adv', 'advokat', true);
    expect(Array.isArray(result)).toBe(true);
    expect(result).not.toBe('all');
    if (Array.isArray(result)) {
      expect(result).toEqual(expect.arrayContaining(['case-owned', 'case-team']));
      expect(result).toHaveLength(2);
    }
  });

  it('non-Admin + scope tanpa perkara → array kosong', async () => {
    const results = new Map<object, unknown>([
      [cases, []],
      [caseMembers, []],
    ]);
    const db = makeMockDb(results);
    const result = await listVisibleCaseIds(db, 'user-adv', 'advokat', true);
    expect(Array.isArray(result) && result.length === 0).toBe(true);
  });

  it('deduplikasi ID (perkara milik sekaligus anggota tim)', async () => {
    const results = new Map<object, unknown>([
      [cases, [{ id: 'case-x' }]],
      [caseMembers, [{ id: 'case-x' }]],
    ]);
    const db = makeMockDb(results);
    const result = await listVisibleCaseIds(db, 'user-adv', 'advokat', true);
    if (Array.isArray(result)) {
      expect(result).toEqual(['case-x']);
    }
  });
});

describe('getCaseForUser — gerbang akses baris', () => {
  it('Admin → ambil langsung (tidak ada cek keanggotaan)', async () => {
    const results = new Map<object, unknown>([[cases, [CASE_ROW]]]);
    const db = makeMockDb(results);
    const result = await getCaseForUser(db, 'c1', 'user-admin', 'admin', true);
    expect(result).not.toBeNull();
    expect(result?.id).toBe('c1');
  });

  it('non-Admin + scope=false → ambil langsung', async () => {
    const results = new Map<object, unknown>([[cases, [CASE_ROW]]]);
    const db = makeMockDb(results);
    const result = await getCaseForUser(db, 'c1', 'user-adv', 'advokat', false);
    expect(result?.id).toBe('c1');
  });

  it('non-Admin + scope=true + tidak terlihat → null', async () => {
    // Query cakupan mengembalikan kosong
    const results = new Map<object, unknown>([[cases, []]]);
    const db = makeMockDb(results);
    const result = await getCaseForUser(db, 'c-hidden', 'user-adv', 'advokat', true);
    expect(result).toBeNull();
  });
});
