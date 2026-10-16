/**
 * Ketergantungan modul surat pada modul lain, sebagai port supaya tes bisa menyuntik tiruan.
 * - `Notifier`  → `notifyGeneric()` (notifications, G4).
 * - `CaseLookup` → `getCaseForUser`/`listVisibleCaseIds`/`getCaseTeamMembers` (cases, D7).
 */
import { eq } from 'drizzle-orm';
import { createDb, settings } from '@ekasatra/db';
import { getCaseForUser, getCaseTeamMembers, listVisibleCaseIds } from '../cases/read';
import { notifyGeneric } from '../notifications/notify';
import type { AuthContext } from '../kernel/auth';
import type { DbExecutor } from '../kernel/db-helpers';

export interface NotifyInput {
  /** Preferensi user yang harus dihormati penerima (PRD §5.1/§5.13). */
  preference: 'email_approval' | 'email_disposisi';
  toUserIds: string[];
  /** Penerima eksternal (kirim surat keluar via email). Tidak terkena preferensi. */
  toEmails?: string[];
  subject: string;
  body: string;
  attachments?: { bucket: string; path: string; fileName: string }[];
}

export interface Notifier {
  notify(input: NotifyInput): Promise<void>;
}

export const noopNotifier: Notifier = {
  async notify() {},
};

// ponytail: notifier tidak menerima db dari pemanggil; createDb() memakai klien yang di-cache per proses.
export const emailNotifier: Notifier = {
  async notify(input) {
    await notifyGeneric(createDb(), input);
  },
};

export interface CaseInfo {
  id: string;
  regNo: string;
  title: string;
  /** Advokat tim perkara, urut paling awal ditambahkan. */
  advokatIds: string[];
}

export interface CaseLookup {
  /** null bila perkara tidak ada atau tidak terlihat oleh `user`. */
  getCase(db: DbExecutor, user: AuthContext, caseId: string): Promise<CaseInfo | null>;
  /** 'all' bila tanpa pembatasan (Admin / scope_assigned_only mati). */
  visibleCaseIds(db: DbExecutor, user: AuthContext): Promise<string[] | 'all'>;
}

export async function readSetting(db: DbExecutor, key: string): Promise<unknown> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return row?.value;
}

export const caseLookup: CaseLookup = {
  visibleCaseIds: (db, user) => listVisibleCaseIds(db, user.userId, user.role),

  async getCase(db, user, caseId) {
    const c = await getCaseForUser(db, caseId, user.userId, user.role);
    if (!c) return null;
    const members = await getCaseTeamMembers(db, caseId);
    return {
      id: c.id,
      regNo: c.regNo,
      title: c.title,
      advokatIds: members.filter((m) => m.peran === 'Advokat').map((m) => m.userId),
    };
  },
};

export interface SuratDeps {
  cases: CaseLookup;
  notifier: Notifier;
}

export const defaultDeps: SuratDeps = { cases: caseLookup, notifier: emailNotifier };

/** Unique-violation Postgres (23505), termasuk yang dibungkus `cause` oleh drizzle. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

