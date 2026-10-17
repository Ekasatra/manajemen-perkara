/**
 * W2.2 — menu sidebar disembunyikan lewat `can('R', resource)` (PRD-MASUKAN §4 R7).
 * Menyembunyikan menu BUKAN otorisasi: rute/API tetap dijaga `requireCan()`/`ensureCan()`.
 */
import { describe, expect, it } from 'vitest';
import { RESOURCES } from '@ekasatra/core';
import { APP_NAV, visibleNav } from '@/shell/app-nav';

const hrefs = (role: string | null) => visibleNav(role === null ? null : { role }).map((i) => i.href);

describe('visibleNav — menu per role', () => {
  it('Advokat/Paralegal tidak melihat Biaya Perkara, Manajemen User, Pengaturan', () => {
    for (const role of ['advokat', 'paralegal']) {
      const seen = hrefs(role);
      expect(seen, role).not.toContain('/invoices');
      expect(seen, role).not.toContain('/users');
      expect(seen, role).not.toContain('/settings');
      // Tetap boleh: Data Advokat (lihat) & Honor Tim (milik sendiri).
      expect(seen, role).toContain('/advocates');
      expect(seen, role).toContain('/honor-tim');
    }
  });

  it('SuperAdmin/Admin melihat Biaya Perkara, Manajemen User, Pengaturan', () => {
    for (const role of ['superadmin', 'admin']) {
      const seen = hrefs(role);
      expect(seen, role).toContain('/invoices');
      expect(seen, role).toContain('/users');
      expect(seen, role).toContain('/settings');
    }
  });

  it('tanpa sesi hanya menu tanpa resource yang tersisa', () => {
    expect(hrefs(null)).toEqual(['/', '/profil']);
  });

  it('entri ber-resource selalu memakai resource kernel yang dikenal', () => {
    for (const item of APP_NAV) {
      if (item.resource) expect(RESOURCES).toContain(item.resource);
    }
  });
});
