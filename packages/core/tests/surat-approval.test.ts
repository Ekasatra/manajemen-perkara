/**
 * Tes tabel keputusan lengkap alur approval surat keluar (PRD §5.6):
 * 5 status × 5 aksi × 5 pelaku, plus routing.
 */
import { describe, expect, it } from 'vitest';
import {
  APPROVAL_ACTIONS,
  SURAT_KELUAR_STATUS,
  availableActions,
  canEditSurat,
  resolveRouting,
  transition,
  type Actor,
  type ApprovalAction,
  type SuratKeluarStatus,
} from '../src/surat/approval';

const ACTORS: Record<string, Actor> = {
  creator: { id: 'c', role: 'Paralegal' },
  reviewer: { id: 'r', role: 'Advokat' },
  signer: { id: 's', role: 'Advokat' },
  admin: { id: 'a', role: 'Admin' },
  outsider: { id: 'o', role: 'Advokat' },
};
const BASE = { createdBy: 'c', reviewerId: 'r', signerId: 's' };

/** Ditulis manual dari PRD (bukan diturunkan dari implementasi). */
const RULES: Record<string, { to: SuratKeluarStatus; who: string[] }> = {
  'Draft|Submit': { to: 'Review', who: ['creator', 'admin'] },
  'Review|Approve': { to: 'Siap_TTD', who: ['reviewer', 'admin'] },
  'Review|Reject': { to: 'Draft', who: ['reviewer', 'admin'] },
  'Siap_TTD|Reject': { to: 'Draft', who: ['signer', 'admin'] },
  'Siap_TTD|Sign': { to: 'Ditandatangani', who: ['signer'] },
  'Ditandatangani|Send': { to: 'Terkirim', who: ['creator', 'signer', 'admin'] },
};

describe('transition — tabel keputusan lengkap', () => {
  for (const status of SURAT_KELUAR_STATUS) {
    for (const action of APPROVAL_ACTIONS) {
      for (const [name, actor] of Object.entries(ACTORS)) {
        const rule = RULES[`${status}|${action}`];
        const label = `${status} × ${action} × ${name}`;
        it(label, () => {
          const r = transition({
            surat: { ...BASE, status },
            action,
            actor,
            note: 'catatan',
          });
          if (!rule) {
            expect(r).toMatchObject({ ok: false, code: 'INVALID_STATE' });
          } else if (rule.who.includes(name)) {
            expect(r).toMatchObject({ ok: true, from: status, to: rule.to });
          } else {
            expect(r).toMatchObject({ ok: false, code: 'FORBIDDEN' });
          }
        });
      }
    }
  }
});

describe('transition — kasus khusus', () => {
  const draft = { ...BASE, status: 'Draft' as const };

  it('Reject wajib catatan (kosong/spasi ditolak)', () => {
    for (const note of [undefined, null, '', '   ']) {
      const r = transition({
        surat: { ...BASE, status: 'Review' },
        action: 'Reject',
        actor: ACTORS.reviewer!,
        note,
      });
      expect(r).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    }
  });

  it('Reject mengembalikan giliran ke pembuat', () => {
    const r = transition({
      surat: { ...BASE, status: 'Siap_TTD' },
      action: 'Reject',
      actor: ACTORS.signer!,
      note: 'perbaiki',
    });
    expect(r).toMatchObject({ ok: true, to: 'Draft', nextActorId: 'c', note: 'perbaiki' });
  });

  it('review dilewati bila reviewer = pembuat', () => {
    const r = transition({
      surat: { ...draft, reviewerId: 'c' },
      action: 'Submit',
      actor: ACTORS.creator!,
    });
    expect(r).toMatchObject({ ok: true, to: 'Siap_TTD', nextActorId: 's' });
  });

  it('review dilewati bila reviewer = penandatangan', () => {
    const r = transition({
      surat: { ...draft, reviewerId: 's' },
      action: 'Submit',
      actor: ACTORS.creator!,
    });
    expect(r).toMatchObject({ ok: true, to: 'Siap_TTD' });
  });

  it('Submit tanpa routing → VALIDATION_ERROR', () => {
    for (const patch of [{ reviewerId: null }, { signerId: null }]) {
      const r = transition({
        surat: { ...draft, ...patch },
        action: 'Submit',
        actor: ACTORS.creator!,
      });
      expect(r).toMatchObject({ ok: false, code: 'VALIDATION_ERROR' });
    }
  });

  it('penerima email berikutnya benar di tiap langkah', () => {
    const next = (status: SuratKeluarStatus, action: ApprovalAction, who: string) =>
      transition({ surat: { ...BASE, status }, action, actor: ACTORS[who]!, note: 'x' });
    expect(next('Draft', 'Submit', 'creator')).toMatchObject({ nextActorId: 'r' });
    expect(next('Review', 'Approve', 'reviewer')).toMatchObject({ nextActorId: 's' });
    expect(next('Siap_TTD', 'Sign', 'signer')).toMatchObject({ nextActorId: 'c' });
    expect(next('Ditandatangani', 'Send', 'creator')).toMatchObject({ nextActorId: null });
  });

  it('pembuat = reviewer: tombol Submit tersedia, Approve tidak (status Draft)', () => {
    const s = { ...draft, reviewerId: 'c' };
    expect(availableActions(s, ACTORS.creator!)).toEqual(['Submit']);
  });
});

describe('availableActions & canEditSurat', () => {
  it('Siap_TTD: signer dapat Reject+Sign, pembuat tidak dapat apa pun', () => {
    const s = { ...BASE, status: 'Siap_TTD' as const };
    expect(availableActions(s, ACTORS.signer!)).toEqual(['Reject', 'Sign']);
    expect(availableActions(s, ACTORS.creator!)).toEqual([]);
  });

  it('edit: pembuat/Admin saat Draft, reviewer saat Review, tidak setelahnya', () => {
    const at = (status: SuratKeluarStatus) => ({ ...BASE, status });
    expect(canEditSurat(at('Draft'), ACTORS.creator!)).toBe(true);
    expect(canEditSurat(at('Draft'), ACTORS.admin!)).toBe(true);
    expect(canEditSurat(at('Draft'), ACTORS.reviewer!)).toBe(false);
    expect(canEditSurat(at('Review'), ACTORS.reviewer!)).toBe(true);
    expect(canEditSurat(at('Review'), ACTORS.creator!)).toBe(false);
    expect(canEditSurat(at('Siap_TTD'), ACTORS.admin!)).toBe(false);
    expect(canEditSurat(at('Terkirim'), ACTORS.creator!)).toBe(false);
  });
});

describe('resolveRouting', () => {
  const base = { creatorId: 'c', creatorRole: 'Paralegal', caseAdvokatIds: ['adv1', 'adv2'] };

  it('Perkara: reviewer = signer = advokat perkara paling awal', () => {
    expect(resolveRouting({ ...base, jenis: 'Perkara' })).toEqual({
      ok: true,
      reviewerId: 'adv1',
      signerId: 'adv1',
    });
  });

  it('Perkara tanpa advokat → gagal', () => {
    expect(resolveRouting({ ...base, jenis: 'Perkara', caseAdvokatIds: [] })).toMatchObject({
      ok: false,
    });
  });

  it('Instansi: signer = pimpinan, fallback Admin pertama', () => {
    const adv = { ...base, jenis: 'Instansi' as const, creatorRole: 'Advokat' };
    expect(resolveRouting({ ...adv, pimpinanUserId: 'p', firstAdminId: 'a' })).toEqual({
      ok: true,
      reviewerId: 'c',
      signerId: 'p',
    });
    expect(resolveRouting({ ...adv, pimpinanUserId: '', firstAdminId: 'a' })).toMatchObject({
      signerId: 'a',
    });
    expect(resolveRouting({ ...adv })).toMatchObject({ ok: false });
  });

  it('Instansi oleh Paralegal wajib memilih reviewer', () => {
    const p = { ...base, jenis: 'Instansi' as const, firstAdminId: 'a' };
    expect(resolveRouting(p)).toMatchObject({ ok: false });
    expect(resolveRouting({ ...p, explicitReviewerId: 'adv9' })).toMatchObject({
      ok: true,
      reviewerId: 'adv9',
    });
  });
});
