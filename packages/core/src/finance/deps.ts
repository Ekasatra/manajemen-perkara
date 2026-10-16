/**
 * Pembaca data modul lain yang dipakai keuangan (Agent F).
 *
 * Kontrak sengaja sempit dan tanpa aturan visibilitas perkara: otorisasi data keuangan lewat
 * `can()` (invoice = Admin saja; honor = milik sendiri), jadi D7 `getCaseForUser` tidak dipakai.
 */
import { desc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import {
  caseMembers,
  cases,
  clients,
  honorTim,
  profiles,
  settings,
  vCaseBilling,
} from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';

export interface CaseInfo {
  id: string;
  regNo: string;
  title: string;
  clientId: string;
}

export async function getCaseInfo(db: DbExecutor, caseId: string): Promise<CaseInfo | null> {
  const [row] = await db
    .select({ id: cases.id, regNo: cases.regNo, title: cases.title, clientId: cases.clientId })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  return row ?? null;
}

export async function getCaseInfos(
  db: DbExecutor,
  ids: readonly string[],
): Promise<Map<string, CaseInfo>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: cases.id, regNo: cases.regNo, title: cases.title, clientId: cases.clientId })
    .from(cases)
    .where(inArray(cases.id, [...ids]));
  return new Map(rows.map((r) => [r.id, r]));
}

export async function getClientNames(
  db: DbExecutor,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(inArray(clients.id, [...ids]));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Anggota tim perkara (unik; satu user boleh punya beberapa peran). */
export async function getCaseMemberIds(db: DbExecutor, caseId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: caseMembers.userId })
    .from(caseMembers)
    .where(eq(caseMembers.caseId, caseId));
  return [...new Set(rows.map((r) => r.userId))];
}

export interface FinanceSettings {
  kasPersen: number;
  kasViewers: string[];
  office: { name: string; address: string; phone: string; email: string; logoPath: string };
}

const DEFAULT_KAS_PERSEN = 20;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Baca setting yang dipakai keuangan; nilai hilang/rusak jatuh ke default PRD. */
export async function getFinanceSettings(db: DbExecutor): Promise<FinanceSettings> {
  const rows = await db.select().from(settings);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const persen = Number(map.get('kas_kantor_persen'));
  const viewers = map.get('kas_viewers');
  return {
    kasPersen:
      Number.isFinite(persen) && persen >= 0 && persen <= 100 ? persen : DEFAULT_KAS_PERSEN,
    kasViewers: Array.isArray(viewers)
      ? viewers.filter((v): v is string => typeof v === 'string')
      : [],
    office: {
      name: str(map.get('office_name')),
      address: str(map.get('office_address')),
      phone: str(map.get('office_phone')),
      email: str(map.get('office_email')),
      logoPath: str(map.get('logo_path')),
    },
  };
}

export interface Option {
  id: string;
  label: string;
}

/** Opsi untuk dropdown form (nama klien). Maks 1.000 baris; urut nama. */
export async function listClientOptions(db: DbExecutor): Promise<Option[]> {
  const rows = await db
    .select({ id: clients.id, name: clients.name, code: clients.clientCode })
    .from(clients)
    .orderBy(clients.name)
    .limit(1000);
  return rows.map((r) => ({ id: r.id, label: `${r.code} · ${r.name}` }));
}

/** Opsi perkara + klien pemiliknya (untuk mengisi klien otomatis di form). */
export async function listCaseOptions(db: DbExecutor): Promise<(Option & { clientId: string })[]> {
  const rows = await db
    .select({ id: cases.id, regNo: cases.regNo, title: cases.title, clientId: cases.clientId })
    .from(cases)
    .orderBy(desc(cases.createdAt))
    .limit(1000);
  return rows.map((r) => ({ id: r.id, label: `${r.regNo} · ${r.title}`, clientId: r.clientId }));
}

export async function getUserNames(
  db: DbExecutor,
  ids: readonly string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await db
    .select({ id: profiles.id, name: profiles.fullName })
    .from(profiles)
    .where(inArray(profiles.id, [...ids]));
  return new Map(rows.map((r) => [r.id, r.name]));
}

/** Total tagihan (Σ amount invoice) satu perkara; 0 bila belum ada invoice. */
export async function getCaseBilledTotal(db: DbExecutor, caseId: string): Promise<number> {
  const [row] = await db
    .select({ total: vCaseBilling.totalAmount })
    .from(vCaseBilling)
    .where(eq(vCaseBilling.caseId, caseId))
    .limit(1);
  return row?.total ?? 0;
}

export interface BilledCase extends CaseInfo {
  totalAmount: number;
  invoiceCount: number;
}

/** Perkara yang punya invoice atau honor, terbaru dulu. */
export async function listBilledCases(
  db: DbExecutor,
  opts: { limit: number; offset: number },
): Promise<{ items: BilledCase[]; total: number }> {
  const where = or(
    gt(vCaseBilling.invoiceCount, 0),
    sql`exists (select 1 from ${honorTim} h where h.case_id = ${cases.id})`,
  );
  const base = db
    .select({
      id: cases.id,
      regNo: cases.regNo,
      title: cases.title,
      clientId: cases.clientId,
      totalAmount: vCaseBilling.totalAmount,
      invoiceCount: vCaseBilling.invoiceCount,
    })
    .from(cases)
    .innerJoin(vCaseBilling, eq(vCaseBilling.caseId, cases.id))
    .where(where);
  const [items, [total]] = await Promise.all([
    base.orderBy(desc(cases.createdAt)).limit(opts.limit).offset(opts.offset),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(cases)
      .innerJoin(vCaseBilling, eq(vCaseBilling.caseId, cases.id))
      .where(where),
  ]);
  return { items, total: total?.value ?? 0 };
}

/** Anggota tim banyak perkara sekaligus (unik per perkara). */
export async function getCaseMembersMap(
  db: DbExecutor,
  caseIds: readonly string[],
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>(caseIds.map((id) => [id, []]));
  if (caseIds.length === 0) return out;
  const rows = await db
    .select({ caseId: caseMembers.caseId, userId: caseMembers.userId })
    .from(caseMembers)
    .where(inArray(caseMembers.caseId, [...caseIds]));
  for (const r of rows) {
    const list = out.get(r.caseId);
    if (list && !list.includes(r.userId)) list.push(r.userId);
  }
  return out;
}
