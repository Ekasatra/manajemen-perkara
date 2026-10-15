/**
 * Alur approval surat keluar (Agent E · E3) — PRD §5.6.
 * Fungsi MURNI: tanpa DB/IO/waktu. Service (`keluar.ts`) memuat data,
 * memanggil fungsi di sini, lalu menyimpan hasilnya.
 */
import { normalizeRole } from '../kernel/policy';

export const SURAT_KELUAR_STATUS = [
  'Draft',
  'Review',
  'Siap_TTD',
  'Ditandatangani',
  'Terkirim',
] as const;
export type SuratKeluarStatus = (typeof SURAT_KELUAR_STATUS)[number];

export const APPROVAL_ACTIONS = ['Submit', 'Approve', 'Reject', 'Sign', 'Send'] as const;
export type ApprovalAction = (typeof APPROVAL_ACTIONS)[number];

export type SuratJenis = 'Perkara' | 'Instansi';

// ---------------------------------------------------------------- routing

export interface RoutingInput {
  jenis: SuratJenis;
  /** Advokat anggota tim perkara, urut dari yang paling awal ditambahkan. */
  caseAdvokatIds: readonly string[];
  creatorId: string;
  creatorRole: string;
  /** Reviewer pilihan pembuat (wajib untuk Instansi bila pembuat bukan Advokat/Admin). */
  explicitReviewerId?: string | null;
  /** Setting `pimpinan_user_id`. */
  pimpinanUserId?: string | null;
  /** Admin aktif paling awal dibuat (fallback penandatangan Instansi). */
  firstAdminId?: string | null;
}

export type RoutingResult =
  | { ok: true; reviewerId: string; signerId: string }
  | { ok: false; message: string };

/**
 * Perkara  → reviewer = penandatangan = advokat perkara (yang paling awal).
 * Instansi → reviewer = pilihan pembuat, atau pembuat sendiri bila Advokat/Admin;
 *            penandatangan = pimpinan_user_id, bila kosong Admin pertama.
 */
export function resolveRouting(input: RoutingInput): RoutingResult {
  if (input.jenis === 'Perkara') {
    const advokat = input.caseAdvokatIds[0];
    if (!advokat) return { ok: false, message: 'Perkara belum memiliki advokat' };
    return { ok: true, reviewerId: advokat, signerId: advokat };
  }

  const role = normalizeRole(input.creatorRole);
  const reviewerId =
    input.explicitReviewerId ||
    (role === 'advokat' || role === 'admin' ? input.creatorId : null);
  if (!reviewerId) return { ok: false, message: 'Reviewer surat instansi wajib dipilih' };

  const signerId = input.pimpinanUserId || input.firstAdminId;
  if (!signerId) return { ok: false, message: 'Penandatangan tidak ditemukan' };

  return { ok: true, reviewerId, signerId };
}

// ------------------------------------------------------------ state machine

export interface Actor {
  id: string;
  role: string;
}

export interface SuratRef {
  status: SuratKeluarStatus;
  createdBy: string | null;
  reviewerId: string | null;
  signerId: string | null;
}

export type TransitionResult =
  | {
      ok: true;
      from: SuratKeluarStatus;
      to: SuratKeluarStatus;
      action: ApprovalAction;
      note: string | null;
      /** Pihak yang berikutnya harus bertindak (penerima email); null bila tidak ada. */
      nextActorId: string | null;
    }
  | { ok: false; code: 'INVALID_STATE' | 'FORBIDDEN' | 'VALIDATION_ERROR'; message: string };

const isAdmin = (a: Actor) => normalizeRole(a.role) === 'admin';

/** Tahap review dilewati bila reviewer = pembuat atau = penandatangan. */
export function reviewSkipped(s: Pick<SuratRef, 'createdBy' | 'reviewerId' | 'signerId'>): boolean {
  return s.reviewerId === s.createdBy || s.reviewerId === s.signerId;
}

const fail = (
  code: 'INVALID_STATE' | 'FORBIDDEN' | 'VALIDATION_ERROR',
  message: string,
): TransitionResult => ({ ok: false, code, message });

/**
 * Satu-satunya tempat aturan perpindahan status. Urutan cek: status valid →
 * pelaku berhak → validasi isian.
 */
export function transition(input: {
  surat: SuratRef;
  action: ApprovalAction;
  actor: Actor;
  note?: string | null;
}): TransitionResult {
  const { surat, action, actor } = input;
  const note = input.note?.trim() || null;
  const from = surat.status;
  const isCreator = surat.createdBy === actor.id;
  const isReviewer = surat.reviewerId === actor.id;
  const isSigner = surat.signerId === actor.id;
  const admin = isAdmin(actor);

  const done = (to: SuratKeluarStatus, nextActorId: string | null): TransitionResult => ({
    ok: true,
    from,
    to,
    action,
    note,
    nextActorId,
  });
  const stateErr = () => fail('INVALID_STATE', `Aksi ${action} tidak berlaku pada status ${from}`);
  const forbid = () => fail('FORBIDDEN', `Tidak berhak melakukan ${action} pada status ${from}`);

  switch (action) {
    case 'Submit': {
      if (from !== 'Draft') return stateErr();
      if (!(isCreator || admin)) return forbid();
      if (!surat.reviewerId || !surat.signerId) {
        return fail('VALIDATION_ERROR', 'Reviewer dan penandatangan belum ditetapkan');
      }
      return reviewSkipped(surat)
        ? done('Siap_TTD', surat.signerId)
        : done('Review', surat.reviewerId);
    }
    case 'Approve': {
      if (from !== 'Review') return stateErr();
      if (!(isReviewer || admin)) return forbid();
      return done('Siap_TTD', surat.signerId);
    }
    case 'Reject': {
      if (from !== 'Review' && from !== 'Siap_TTD') return stateErr();
      const berhak = from === 'Review' ? isReviewer : isSigner;
      if (!(berhak || admin)) return forbid();
      if (!note) return fail('VALIDATION_ERROR', 'Catatan penolakan wajib diisi');
      return done('Draft', surat.createdBy);
    }
    case 'Sign': {
      if (from !== 'Siap_TTD') return stateErr();
      if (!isSigner) return forbid(); // hanya signer_id, Admin pun tidak
      return done('Ditandatangani', surat.createdBy);
    }
    case 'Send': {
      if (from !== 'Ditandatangani') return stateErr();
      if (!(isCreator || isSigner || admin)) return forbid();
      return done('Terkirim', null);
    }
  }
}

/** Aksi yang boleh dilakukan `actor` sekarang — sumber tombol di UI (E5). */
export function availableActions(surat: SuratRef, actor: Actor): ApprovalAction[] {
  return APPROVAL_ACTIONS.filter(
    (action) => transition({ surat, action, actor, note: 'x' }).ok,
  );
}

/** Edit isi surat: pembuat/Admin saat Draft, reviewer saat Review (PRD §5.6). */
export function canEditSurat(surat: SuratRef, actor: Actor): boolean {
  if (surat.status === 'Draft') return surat.createdBy === actor.id || isAdmin(actor);
  if (surat.status === 'Review') return surat.reviewerId === actor.id;
  return false;
}
