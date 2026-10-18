/**
 * Tes D3 — transisi status perkara (fungsi murni, PRD §5.4).
 * Tabel keputusan: status × kondisi → field yang berubah + entri timeline.
 */
import { describe, expect, it } from 'vitest';
import { applyStatusChange, addDays, canChangeStatus } from '../src/cases/status';
import type { CaseStatusState } from '../src/cases/status';

const TODAY = '2026-10-15';
const base: CaseStatusState = {
  status: 'Aktif',
  putusDate: null,
  upayaDeadline: null,
  closedDate: null,
};

describe('addDays', () => {
  it('menambah hari tanpa melewati zona waktu', () => {
    expect(addDays('2026-10-15', 14)).toBe('2026-10-29');
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('applyStatusChange — Putus (PRD §5.4)', () => {
  it('set putus_date=today dan upaya_deadline=today+14', () => {
    const r = applyStatusChange({
      current: base,
      newStatus: 'Putus',
      bandingDeadlineDays: 14,
      today: TODAY,
    });
    expect(r.caseUpdate).toEqual({
      status: 'Putus',
      putusDate: TODAY,
      upayaDeadline: '2026-10-29',
      closedDate: null,
    });
    expect(r.timelineEntry.eventType).toBe('Putusan');
    expect(r.timelineEntry.eventDate).toBe(TODAY);
    expect(r.timelineEntry.description).toContain('2026-10-29');
  });

  it('menghormati banding_deadline_days kustom', () => {
    const r = applyStatusChange({
      current: base,
      newStatus: 'Putus',
      bandingDeadlineDays: 30,
      today: TODAY,
    });
    expect(r.caseUpdate.upayaDeadline).toBe('2026-11-14');
  });
});

describe('applyStatusChange — Banding/Kasasi/PK (kosongkan upaya)', () => {
  for (const status of ['Banding', 'Kasasi', 'PK'] as const) {
    it(`${status}: upaya_deadline=null, tidak set closed_date`, () => {
      const current: CaseStatusState = {
        status: 'Putus',
        putusDate: '2026-09-01',
        upayaDeadline: '2026-09-15',
        closedDate: null,
      };
      const r = applyStatusChange({
        current,
        newStatus: status,
        bandingDeadlineDays: 14,
        today: TODAY,
      });
      expect(r.caseUpdate.upayaDeadline).toBeNull();
      expect(r.caseUpdate.closedDate).toBeNull();
      // putusDate tidak diubah (dibiarkan apa adanya)
      expect(r.caseUpdate.putusDate).toBe('2026-09-01');
      expect(r.caseUpdate.status).toBe(status);
      expect(r.timelineEntry.eventType).toBe(status);
    });
  }
});

describe('applyStatusChange — Selesai', () => {
  it('set closed_date=today, kosongkan upaya_deadline', () => {
    const r = applyStatusChange({
      current: { status: 'Kasasi', putusDate: '2026-09-01', upayaDeadline: null, closedDate: null },
      newStatus: 'Selesai',
      bandingDeadlineDays: 14,
      today: TODAY,
    });
    expect(r.caseUpdate.closedDate).toBe(TODAY);
    expect(r.caseUpdate.upayaDeadline).toBeNull();
    expect(r.timelineEntry.eventType).toBe('Status');
  });
});

describe('applyStatusChange — Aktif (kembali)', () => {
  it('kosongkan upaya_deadline dan closed_date', () => {
    const r = applyStatusChange({
      current: { status: 'Selesai', putusDate: '2026-01-01', upayaDeadline: null, closedDate: '2026-03-01' },
      newStatus: 'Aktif',
      bandingDeadlineDays: 14,
      today: TODAY,
    });
    expect(r.caseUpdate.upayaDeadline).toBeNull();
    expect(r.caseUpdate.closedDate).toBeNull();
    expect(r.caseUpdate.status).toBe('Aktif');
    expect(r.timelineEntry.eventType).toBe('Status');
  });
});

describe('applyStatusChange — timeline title', () => {
  it('menyebut transisi dari→ke', () => {
    const r = applyStatusChange({
      current: { status: 'Aktif', putusDate: null, upayaDeadline: null, closedDate: null },
      newStatus: 'Banding',
      bandingDeadlineDays: 14,
      today: TODAY,
    });
    expect(r.timelineEntry.title).toBe('Status berubah: Aktif → Banding');
  });
});

// ---------------------------------------------------------------------------
// PRD §4 R9 — Kunci status Selesai: tabel keputusan role × transisi.
// ---------------------------------------------------------------------------

describe('canChangeStatus — PRD §4 R9 (Kunci status Selesai)', () => {
  // Semua status non-Selesai untuk transisi "lainnya".
  const NON_SELESAI = ['Aktif', 'Putus', 'Banding', 'Kasasi', 'PK'] as const;

  describe('SuperAdmin — semua transisi bebas', () => {
    // Ke Selesai dari setiap status.
    for (const from of ['Aktif', 'Putus', 'Banding', 'Kasasi', 'PK'] as const) {
      it(`SuperAdmin: ${from} → Selesai = allowed`, () => {
        expect(canChangeStatus('superadmin', from, 'Selesai')).toEqual({ allowed: true });
      });
    }
    // Dari Selesai ke setiap status lain.
    for (const to of NON_SELESAI) {
      it(`SuperAdmin: Selesai → ${to} = allowed`, () => {
        expect(canChangeStatus('superadmin', 'Selesai', to)).toEqual({ allowed: true });
      });
    }
    // Transisi non-Selesai lainnya.
    it('SuperAdmin: Aktif → Putus = allowed', () => {
      expect(canChangeStatus('superadmin', 'Aktif', 'Putus')).toEqual({ allowed: true });
    });
    it('SuperAdmin: Kasasi → PK = allowed', () => {
      expect(canChangeStatus('superadmin', 'Kasasi', 'PK')).toEqual({ allowed: true });
    });
  });

  // Peran non-SuperAdmin yang memiliki U cases: Admin, Advokat, Paralegal.
  for (const role of ['admin', 'advokat', 'paralegal'] as const) {
    describe(`${role} — transisi Selesai diblokir, lainnya bebas`, () => {
      // Ke Selesai dari setiap status non-Selesai.
      for (const from of NON_SELESAI) {
        it(`${role}: ${from} → Selesai = BLOCKED`, () => {
          expect(canChangeStatus(role, from, 'Selesai')).toEqual({ allowed: false });
        });
      }
      // Dari Selesai ke setiap status lain.
      for (const to of NON_SELESAI) {
        it(`${role}: Selesai → ${to} = BLOCKED`, () => {
          expect(canChangeStatus(role, 'Selesai', to)).toEqual({ allowed: false });
        });
      }
      // Transisi non-Selesai lainnya tetap bebas.
      it(`${role}: Aktif → Putus = allowed`, () => {
        expect(canChangeStatus(role, 'Aktif', 'Putus')).toEqual({ allowed: true });
      });
      it(`${role}: Putus → Banding = allowed`, () => {
        expect(canChangeStatus(role, 'Putus', 'Banding')).toEqual({ allowed: true });
      });
      it(`${role}: Banding → Kasasi = allowed`, () => {
        expect(canChangeStatus(role, 'Banding', 'Kasasi')).toEqual({ allowed: true });
      });
      it(`${role}: Kasasi → PK = allowed`, () => {
        expect(canChangeStatus(role, 'Kasasi', 'PK')).toEqual({ allowed: true });
      });
    });
  }

  describe('normalisasi role DB berkapital', () => {
    it('SuperAdmin (kapital) diperlakukan sebagai superadmin', () => {
      expect(canChangeStatus('SuperAdmin', 'Aktif', 'Selesai')).toEqual({ allowed: true });
      expect(canChangeStatus('SuperAdmin', 'Selesai', 'Aktif')).toEqual({ allowed: true });
    });
    it('Admin (kapital) tidak boleh ke Selesai', () => {
      expect(canChangeStatus('Admin', 'Aktif', 'Selesai')).toEqual({ allowed: false });
    });
    it('Advokat (kapital) tidak boleh dari Selesai', () => {
      expect(canChangeStatus('Advokat', 'Selesai', 'Aktif')).toEqual({ allowed: false });
    });
    it('Paralegal (kapital) tidak boleh ke Selesai', () => {
      expect(canChangeStatus('Paralegal', 'PK', 'Selesai')).toEqual({ allowed: false });
    });
  });

  describe('viewer — transisi Selesai diblokir', () => {
    it('viewer: Aktif → Selesai = BLOCKED', () => {
      expect(canChangeStatus('viewer', 'Aktif', 'Selesai')).toEqual({ allowed: false });
    });
    it('viewer: Selesai → Aktif = BLOCKED', () => {
      expect(canChangeStatus('viewer', 'Selesai', 'Aktif')).toEqual({ allowed: false });
    });
  });

  describe('role tak dikenal → least privilege (viewer)', () => {
    it('role acak tidak boleh ke Selesai', () => {
      expect(canChangeStatus('hacker', 'Aktif', 'Selesai')).toEqual({ allowed: false });
    });
    it('role acak tidak boleh dari Selesai', () => {
      expect(canChangeStatus('hacker', 'Selesai', 'Aktif')).toEqual({ allowed: false });
    });
    it('role acak tetap boleh transisi non-Selesai', () => {
      expect(canChangeStatus('hacker', 'Aktif', 'Putus')).toEqual({ allowed: true });
    });
  });
});
