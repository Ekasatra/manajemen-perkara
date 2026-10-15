/**
 * Aturan murni honor tim (Agent F · F4–F5, PRD §5.9). Tanpa DB.
 * - draft (kerja Admin) vs published (yang dilihat anggota) terpisah.
 * - "terisi" = ada baris honor untuk anggota itu (0 sah); kolom draft default 0 tidak bisa membedakannya.
 */
import { conflict, validationError } from '@ekasatra/shared';
import type { HonorState } from '@ekasatra/shared/honor-tim';

export interface HonorRow {
  userId: string;
  draftAmount: number;
  publishedAmount: number | null;
  status: 'Belum' | 'Dibayar';
}

export type PublishIssue =
  | { code: 'MISSING'; userId: string; message: string }
  | { code: 'INVALID'; userId: string; message: string }
  | { code: 'STALE_PAID'; userId: string; message: string }
  | { code: 'OVER_FUND'; message: string };

export interface PublishPlan {
  issues: PublishIssue[];
  /** Total draft anggota yang akan didistribusikan. */
  total: number;
  /** Baris milik user yang sudah keluar dari tim & belum dibayar — dibuang saat publish. */
  removeUserIds: string[];
}

const isRupiah = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Validasi publish (PRD §5.9): semua anggota terisi, tak ada nilai negatif, total ≤ dana distribusi. */
export function planPublish(
  memberIds: readonly string[],
  rows: readonly HonorRow[],
  fund: number,
): PublishPlan {
  const byUser = new Map(rows.map((r) => [r.userId, r]));
  const members = new Set(memberIds);
  const issues: PublishIssue[] = [];
  let total = 0;

  for (const userId of members) {
    const row = byUser.get(userId);
    if (!row) {
      issues.push({ code: 'MISSING', userId, message: 'Honor anggota belum diisi (0 boleh)' });
    } else if (!isRupiah(row.draftAmount)) {
      issues.push({ code: 'INVALID', userId, message: 'Nilai honor harus rupiah bulat ≥ 0' });
    } else {
      total += row.draftAmount;
    }
  }

  const removeUserIds: string[] = [];
  for (const row of rows) {
    if (members.has(row.userId)) continue;
    if (row.status === 'Dibayar') {
      issues.push({
        code: 'STALE_PAID',
        userId: row.userId,
        message: 'Anggota sudah keluar dari tim tetapi honornya berstatus Dibayar',
      });
    } else {
      removeUserIds.push(row.userId);
    }
  }

  if (total > fund) {
    issues.push({
      code: 'OVER_FUND',
      message: `Total honor ${total} melebihi dana distribusi ${fund}`,
    });
  }
  return { issues, total, removeUserIds };
}

/** State per perkara. "Berubah" juga bila tim berubah atau dana distribusi kini < total published. */
export function honorState(
  memberIds: readonly string[],
  rows: readonly HonorRow[],
  fund: number,
): HonorState {
  const published = rows.filter((r) => r.publishedAmount !== null);
  if (published.length === 0) return 'Draft';

  const byUser = new Map(rows.map((r) => [r.userId, r]));
  const members = new Set(memberIds);
  const memberChanged = memberIds.some((id) => {
    const r = byUser.get(id);
    return !r || r.publishedAmount === null || r.draftAmount !== r.publishedAmount;
  });
  const hasStale = rows.some((r) => !members.has(r.userId));
  const publishedTotal = published.reduce((sum, r) => sum + (r.publishedAmount ?? 0), 0);

  return memberChanged || hasStale || publishedTotal > fund ? 'Berubah' : 'Terdistribusi';
}

/** Simpan draft: nilai harus untuk anggota tim, dan honor yang sudah Dibayar tidak boleh diubah. */
export function assertDraftEditable(
  memberIds: readonly string[],
  rows: readonly HonorRow[],
  items: readonly { userId: string; amount: number }[],
): void {
  const members = new Set(memberIds);
  const byUser = new Map(rows.map((r) => [r.userId, r]));
  for (const { userId, amount } of items) {
    if (!isRupiah(amount)) throw validationError('Nilai honor harus rupiah bulat ≥ 0');
    if (!members.has(userId)) throw validationError('Penerima honor bukan anggota tim perkara');
    const row = byUser.get(userId);
    if (row?.status === 'Dibayar' && row.publishedAmount !== amount) {
      throw conflict('Honor sudah Dibayar; batalkan status Dibayar sebelum mengubah nilainya');
    }
  }
}

/** Yang boleh dilihat anggota non-Admin: hanya nilai published — draft tidak pernah ikut. */
export function toMemberView(
  row: HonorRow,
): { amount: number; status: 'Belum' | 'Dibayar' } | null {
  if (row.publishedAmount === null) return null;
  return { amount: row.publishedAmount, status: row.status };
}
