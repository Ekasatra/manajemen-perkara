/**
 * Tes policy kernel — matriks PRD §4 lengkap (role × resource × aksi).
 * Juga mencakup bagian dari H2 (tes policy otomatis).
 */
import { describe, expect, it } from 'vitest';
import { can, canViewKas, ensureCan, normalizeRole, POLICY, RESOURCES } from '../src';

describe('normalizeRole', () => {
  it('menerima kapitalisasi DB (Admin/Advokat/Paralegal)', () => {
    expect(normalizeRole('Admin')).toBe('admin');
    expect(normalizeRole('ADVOKAT')).toBe('advokat');
    expect(normalizeRole('Paralegal')).toBe('paralegal');
  });

  it('menerima lowercase shared + viewer', () => {
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
      { admin: 'CRUD', advokat: '', paralegal: '', viewer: '' },
    ],
    ['clients', '', { admin: 'CRUD', advokat: '', paralegal: '', viewer: '' }],
    ['opponents', '', { admin: 'CRUD', advokat: '', paralegal: '', viewer: '' }],
    [
      'advocates',
      'Data Advokat: non-Admin hanya milik sendiri',
      { admin: 'CRUD', advokat: 'RU', paralegal: 'RU', viewer: 'R' },
    ],
    [
      'settings',
      'Pengaturan: Admin CRUD, lainnya R',
      { admin: 'CRUD', advokat: 'R', paralegal: 'R', viewer: 'R' },
    ],
    [
      'cases',
      'Perkara: Advokat RU+C, Paralegal RU',
      { admin: 'CRUD', advokat: 'RUC', paralegal: 'RU', viewer: 'R' },
    ],
    [
      'timeline',
      'Timeline/Jadwal/Dokumen: Paralegal CRU',
      { admin: 'CRUD', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' },
    ],
    ['schedules', '', { admin: 'CRUD', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' }],
    ['case_documents', '', { admin: 'CRUD', advokat: 'CRUD', paralegal: 'CRU', viewer: 'R' }],
    [
      'surat_masuk',
      'Surat: semua staf CRU',
      { admin: 'CRUD', advokat: 'CRU', paralegal: 'CRU', viewer: 'R' },
    ],
    ['surat_keluar', '', { admin: 'CRUD', advokat: 'CRU', paralegal: 'CRU', viewer: 'R' }],
    [
      'invoices',
      'Biaya Perkara: hanya Admin',
      { admin: 'CRUD', advokat: '', paralegal: '', viewer: '' },
    ],
    [
      'honor_tim',
      'Honor: Admin kelola, lainnya lihat milik sendiri',
      { admin: 'CRUD', advokat: 'R', paralegal: 'R', viewer: 'R' },
    ],
    [
      'kas',
      'Kas: Admin R, non-Admin via kas_viewers (canViewKas)',
      { admin: 'R', advokat: '', paralegal: '', viewer: '' },
    ],
    [
      'reports',
      'Laporan & Audit Log: Admin R saja',
      { admin: 'R', advokat: '', paralegal: '', viewer: '' },
    ],
    ['audit_log', '', { admin: 'R', advokat: '', paralegal: '', viewer: '' }],
    [
      'templates',
      'Template: unggah Admin, unduh semua staf',
      { admin: 'CRUD', advokat: 'R', paralegal: 'R', viewer: 'R' },
    ],
  ];

  for (const [resource, , expected] of table) {
    it(`${resource}: sesuai PRD §4`, () => {
      for (const role of ['admin', 'advokat', 'paralegal', 'viewer'] as const) {
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
      for (const role of ['admin', 'advokat', 'paralegal', 'viewer'] as const) {
        expect(typeof POLICY[r][role], `${r}/${role}`).toBe('string');
        expect(POLICY[r][role], `${r}/${role}`).toMatch(/^[CRUD]*$/);
      }
    }
  });
});

describe('can / ensureCan', () => {
  it('can() menolak akses di luar matriks', () => {
    expect(can({ role: 'advokat' }, 'D', 'cases')).toBe(false);
    expect(can({ role: 'paralegal' }, 'U', 'users')).toBe(false);
    expect(can({ role: 'admin' }, 'U', 'invoices')).toBe(true);
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
