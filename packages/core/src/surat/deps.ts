/**
 * Ketergantungan modul surat pada agen lain (Agent E).
 * - `Notifier`  → `notify()` Agent G (G4). Sebelum tersedia: `noopNotifier`.
 * - `CaseLookup` → D7 `getCaseForUser`/`listVisibleCaseIds` Agent D. Sebelum
 *   tersedia: `tempCaseLookup` (baca `cases`/`case_members` langsung).
 * Mengganti implementasi cukup mengganti `defaultDeps`; lihat docs/REQUESTS.md.
 */
import { asc, eq } from 'drizzle-orm';
import { caseMembers, cases, settings } from '@ekasatra/db';
import { isAdminRole } from '../kernel/policy';
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
  async notify() {
    /* menunggu notify() Agent G */
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

async function scopeAssignedOnly(db: DbExecutor): Promise<boolean> {
  const v = await readSetting(db, 'scope_assigned_only');
  return v === true || v === 'Ya';
}

// ponytail: duplikasi sementara aturan scope D7; hapus saat D7 masuk main.
export const tempCaseLookup: CaseLookup = {
  async visibleCaseIds(db, user) {
    if (isAdminRole(user.role) || !(await scopeAssignedOnly(db))) return 'all';
    const [own, member] = await Promise.all([
      db.select({ id: cases.id }).from(cases).where(eq(cases.createdBy, user.userId)),
      db
        .select({ id: caseMembers.caseId })
        .from(caseMembers)
        .where(eq(caseMembers.userId, user.userId)),
    ]);
    return [...new Set([...own, ...member].map((r) => r.id))];
  },

  async getCase(db, user, caseId) {
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId)).limit(1);
    if (!c) return null;
    const members = await db
      .select()
      .from(caseMembers)
      .where(eq(caseMembers.caseId, caseId))
      .orderBy(asc(caseMembers.createdAt));
    const visible =
      c.createdBy === user.userId || members.some((m) => m.userId === user.userId);
    if (!visible && !isAdminRole(user.role) && (await scopeAssignedOnly(db))) {
      return null;
    }
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

export const defaultDeps: SuratDeps = { cases: tempCaseLookup, notifier: noopNotifier };

/** Unique-violation Postgres (23505), termasuk yang dibungkus `cause` oleh drizzle. */
export function isUniqueViolation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === '23505' || e?.cause?.code === '23505';
}

