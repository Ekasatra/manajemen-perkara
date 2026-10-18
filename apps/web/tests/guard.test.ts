/**
 * W2.2 / R7 — guard halaman `requireCan()` memanggil `forbidden()` (halaman "Tidak punya akses", 403)
 * untuk tiap sel ✘ matriks akses PRD-MASUKAN §4 R7, dan tidak memanggilnya saat role berhak.
 * Ini pelengkap tes matriks di `packages/core/tests/policy.test.ts`.
 */
import { describe, expect, it, vi } from 'vitest';

const { forbidden } = vi.hoisted(() => ({ forbidden: vi.fn() }));

vi.mock('next/navigation', () => ({ forbidden }));

import { requireCan } from '@/lib/guard';

describe('requireCan — halaman ditolak (R7)', () => {
  it('Advokat/Paralegal ditolak di Biaya Perkara, Manajemen User, Pengaturan', () => {
    for (const role of ['advokat', 'paralegal']) {
      for (const resource of ['invoices', 'users', 'settings'] as const) {
        forbidden.mockClear();
        requireCan({ role }, 'R', resource);
        expect(forbidden, `${role} R ${resource}`).toHaveBeenCalledTimes(1);
      }
    }
  });

  it('Advokat/Paralegal ditolak menambah/mengubah Data Advokat', () => {
    for (const role of ['advokat', 'paralegal']) {
      for (const action of ['C', 'U'] as const) {
        forbidden.mockClear();
        requireCan({ role }, action, 'advocates');
        expect(forbidden, `${role} ${action} advocates`).toHaveBeenCalledTimes(1);
      }
    }
  });

  it('Advokat/Paralegal ditolak editor honor perkara (U) dan kas (R)', () => {
    for (const role of ['advokat', 'paralegal']) {
      forbidden.mockClear();
      requireCan({ role }, 'U', 'honor_tim');
      requireCan({ role }, 'R', 'kas');
      expect(forbidden).toHaveBeenCalledTimes(2);
    }
  });

  it('role berhak tidak ditolak', () => {
    forbidden.mockClear();
    requireCan({ role: 'admin' }, 'R', 'invoices');
    requireCan({ role: 'superadmin' }, 'R', 'settings');
    requireCan({ role: 'advokat' }, 'R', 'advocates');
    requireCan({ role: 'advokat' }, 'R', 'honor_tim');
    expect(forbidden).not.toHaveBeenCalled();
  });
});
