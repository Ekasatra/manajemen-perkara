/**
 * Tes policy kernel — matriks PRD §4 lengkap (role × resource × aksi).
 * Juga mencakup bagian dari H2 (tes policy otomatis).
 */
import { describe, expect, it } from 'vitest';
import {
  can,
  canViewKas,
  ensureCan,
  isAppError,
  normalizeRole,
  POLICY,
  RESOURCES,
} from '../src';
import type { Action, Resource } from '../src';

describe('normalizeRole', () => {
  it('menerima kapitalisasi DB (Admin/Advokat/Paralegal)', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole('ADVOKAT')).toBe('advokat');
    expect(normalizeRole('Paralegal')).toBe('paralegal');
  });

  it('menerima lowercase shared + viewer', () => {
    expect(normalizeRole('SuperAdmin')).toBe('superadmin');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('viewer')).toBe('viewer');
  });

  it('role tak dikenal → viewer (least privilege)', () => {
    expect(normalizeRole('hacker')).toBe('viewer');
    expect(normalizeRole('')).toBe('viewer');
  });
});

describe('POLICY — matriks PRD §4', () => {
  const table: [string, string, Record<string, string>][] = [
    // [resource, catatan, {role: aksi}]
    [
      'users',
      'Users, Klien, Pihak Lawan: hanya Admin CRUD',
      { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
    ],
    ['clients', '', { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' }],
    ['opponents', '', { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' }],
    [
      'advocates',
      'Data Advokat (R7): lihat semua peran, tambah/ubah hanya SuperAdmin/Admin',
      { superadmin: 'CRUD', admin: 'CRU', advokat: 'R', paralegal: 'R', viewer: 'R' },
    ],
    [
      'settings',
      'Pengaturan (R7): menu + API hanya SuperAdmin/Admin',
      { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
    ],
    [
      'cases',
      'Perkara: Advokat RU+C, Paralegal RU',
      { superadmin: 'CRUD', admin: 'CRU', advokat: 'RUC', paralegal: 'RU', viewer: 'R' },
    ],
    [
      'timeline',
      'Timeline/Jadwal/Dokumen: Paralegal CRU',
      { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' },
    ],
    ['schedules', '', { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' }],
    ['case_documents', '', { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' }],
    [
      'surat_masuk',
      'Surat: semua staf CRU',
      { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRU', paralegal: 'CRU', viewer: 'R' },
    ],
    ['surat_keluar', '', { superadmin: 'CRUD', admin: 'CRU', advokat: 'CRU', paralegal: 'CRU', viewer: 'R' }],
    [
      'invoices',
      'Biaya Perkara: hanya Admin',
      { superadmin: 'CRUD', admin: 'CRU', advokat: '', paralegal: '', viewer: '' },
    ],
    [
      'honor_tim',
      'Honor: Admin kelola, lainnya lihat milik sendiri',
      { superadmin: 'CRUD', admin: 'CRU', advokat: 'R', paralegal: 'R', viewer: 'R' },
    ],
    [
      'kas',
      'Kas: Admin R, non-Admin via kas_viewers (canViewKas)',
      { superadmin: 'R', admin: 'R', advokat: '', paralegal: '', viewer: '' },
    ],
    [
      'reports',
      'Laporan & Audit Log: Admin R saja',
      { superadmin: 'R', admin: 'R', advokat: '', paralegal: '', viewer: '' },
    ],
    ['audit_log', '', { superadmin: 'R', admin: 'R', advokat: '', paralegal: '', viewer: '' }],
    [
      'templates',
      'Template: unggah Admin, unduh semua staf',
      { superadmin: 'CRUD', admin: 'CRU', advokat: 'R', paralegal: 'R', viewer: 'R' },
    ],
  ];

  for (const [resource, , expected] of table) {
    it(`${resource}: sesuai PRD §4`, () => {
      for (const role of ['superadmin', 'admin', 'advokat', 'paralegal', 'viewer'] as const) {
        const allowed = expected[role] ?? '';
        for (const action of ['C', 'R', 'U', 'D'] as const) {
          expect(can({ role }, action, resource as never), `${role}/${action}/${resource}`).toBe(
            allowed.includes(action),
          );
        }
      }
    });
  }

  it('semua resource didefinisikan lengkap', () => {
    for (const r of RESOURCES) {
      for (const role of ['superadmin', 'admin', 'advokat', 'paralegal', 'viewer'] as const) {
        expect(typeof POLICY[r][role], `${r}/${role}`).toBe('string');
        expect(POLICY[r][role], `${r}/${role}`).toMatch(/^[CRUD]*$/);
      }
    }
  });
});

/**
 * PRD-MASUKAN §4 R7 — setiap sel ✘ harus ditolak server (403), bukan sekadar menu disembunyikan.
 * Sel ✘: Biaya Perkara (`invoices`), Manajemen User (`users`), Pengaturan (`settings`) untuk
 * Advokat/Paralegal; Data Advokat (`advocates`) tambah/ubah (C/U) untuk Advokat/Paralegal.
 */
describe('matriks R7 — setiap sel ✘ → FORBIDDEN 403', () => {
  const denied: { role: string; action: Action; resource: Resource; menu: string }[] = [];
  for (const role of ['advokat', 'paralegal'] as const) {
    for (const action of ['C', 'R', 'U', 'D'] as const) {
      denied.push({ role, action, resource: 'invoices', menu: 'Biaya Perkara' });
      denied.push({ role, action, resource: 'users', menu: 'Manajemen User' });
      denied.push({ role, action, resource: 'settings', menu: 'Pengaturan' });
    }
    for (const action of ['C', 'U'] as const) {
      denied.push({ role, action, resource: 'advocates', menu: 'Data Advokat tambah/ubah' });
    }
  }

  for (const { role, action, resource, menu } of denied) {
    it(`${role} ${action} ${resource} (${menu}) → 403`, () => {
      expect(can({ role }, action, resource), `${role}/${action}/${resource}`).toBe(false);
      let thrown: unknown = null;
      try {
        ensureCan({ role }, action, resource);
      } catch (e) {
        thrown = e;
      }
      expect(isAppError(thrown), `${role}/${action}/${resource} harus melempar AppError`).toBe(true);
      expect(thrown).toMatchObject({ code: 'FORBIDDEN', status: 403 });
    });
  }

  it('SuperAdmin & Admin tetap boleh: Biaya Perkara, Manajemen User, Pengaturan', () => {
    for (const role of ['superadmin', 'admin'] as const) {
      for (const resource of ['invoices', 'users', 'settings'] as const) {
        expect(() => ensureCan({ role }, 'R', resource)).not.toThrow();
      }
      expect(() => ensureCan({ role }, 'C', 'advocates')).not.toThrow();
      expect(() => ensureCan({ role }, 'U', 'advocates')).not.toThrow();
    }
  });

  it('Advokat/Paralegal tetap boleh melihat Data Advokat (R6/R7)', () => {
    for (const role of ['advokat', 'paralegal'] as const) {
      expect(can({ role }, 'R', 'advocates')).toBe(true);
      expect(() => ensureCan({ role }, 'R', 'advocates')).not.toThrow();
    }
  });

  it('Honor Tim: non-Admin hanya R (baca milik sendiri), tanpa U admin-only', () => {
    for (const role of ['advokat', 'paralegal'] as const) {
      expect(can({ role }, 'R', 'honor_tim')).toBe(true);
      expect(can({ role }, 'U', 'honor_tim')).toBe(false);
      expect(() => ensureCan({ role }, 'U', 'honor_tim')).toThrow();
    }
  });
});

describe('can / ensureCan', () => {
  it('can() menolak akses di luar matriks', () => {
    expect(can({ role: 'advokat' }, 'D', 'cases')).toBe(false);
    expect(can({ role: 'paralegal' }, 'U', 'users')).toBe(false);
    expect(can({ role: 'admin' }, 'U', 'invoices')).toBe(true);
  });

  it('hanya superadmin yang boleh menghapus; admin tetap boleh buat dan ubah', () => {
    for (const resource of RESOURCES) {
      expect(can({ role: 'admin' }, 'D', resource), `admin/D/${resource}`).toBe(false);
    }
    for (const resource of ['users', 'clients', 'opponents', 'cases', 'invoices'] as const) {
      expect(can({ role: 'superadmin' }, 'D', resource)).toBe(true);
      expect(can({ role: 'admin' }, 'C', resource)).toBe(true);
      expect(can({ role: 'admin' }, 'U', resource)).toBe(true);
    }
  });

  it('menerima role berkapitalisasi dari DB', () => {
    expect(can({ role: 'Admin' }, 'C', 'clients')).toBe(true);
    expect(can({ role: 'Advokat' }, 'C', 'cases')).toBe(true);
  });

  it('ensureCan melempar AppError FORBIDDEN (403)', () => {
    expect(() => ensureCan({ role: 'paralegal' }, 'D', 'cases')).toThrowError(
      /FORBIDDEN|Akses ditolak/,
    );
    expect(() => ensureCan({ role: 'Admin' }, 'R', 'audit_log')).not.toThrow();
  });
});

describe('canViewKas', () => {
  const kasViewers = ['uuid-advokat-1'];
  it('Admin selalu boleh', () => {
    expect(canViewKas({ role: 'admin', userId: 'uuid-admin' }, kasViewers)).toBe(true);
  });
  it('non-Admin boleh hanya bila tercantum di kas_viewers', () => {
    expect(canViewKas({ role: 'advokat', userId: 'uuid-advokat-1' }, kasViewers)).toBe(true);
    expect(canViewKas({ role: 'advokat', userId: 'uuid-advokat-2' }, kasViewers)).toBe(false);
    expect(canViewKas({ role: 'paralegal', userId: 'uuid-paralegal' }, [])).toBe(false);
  });
});
