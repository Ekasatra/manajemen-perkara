/**
 * Service honor tim & kas kantor (Agent F · F4, F5, PRD §5.9).
 * - Admin mengelola draft → distribusi (publish); anggota hanya menerima nilai published.
 * - Kas = persen × total tagihan perkara (dibulatkan per perkara); dana distribusi = total − kas.
 * - Total kas kantor hanya untuk Admin + `kas_viewers` (PRD §4).
 */
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { honorTim } from '@ekasatra/db';
import { conflict, forbidden, notFound, validationError } from '@ekasatra/shared';
import type { HonorState } from '@ekasatra/shared/honor-tim';
import type { AuthContext } from '../kernel/auth';
import { logActivity } from '../kernel/activity';
import { withTx, type DbExecutor } from '../kernel/db-helpers';
import { canViewKas, ensureCan } from '../kernel/policy';
import { notify } from '../notifications/notify';
import {
  getCaseBilledTotal,
  getCaseInfo,
  getCaseInfos,
  getCaseMemberIds,
  getCaseMembersMap,
  getFinanceSettings,
  getUserNames,
  listBilledCases,
  type CaseInfo,
} from '../finance/deps';
import { distributableFund, kasShare } from '../finance/money';
import { honorState, assertDraftEditable, planPublish, type HonorRow } from './rules';

const MODULE = 'honor-tim';

type HonorDbRow = typeof honorTim.$inferSelect;

const toRow = (r: HonorDbRow): HonorRow => ({
  userId: r.userId,
  draftAmount: r.draftAmount,
  publishedAmount: r.publishedAmount,
  status: r.status,
});

export interface HonorMemberItem {
  userId: string;
  fullName: string;
  /** false = sudah keluar dari tim perkara tetapi barisnya masih ada. */
  isMember: boolean;
  /** null = belum diisi Admin. */
  draftAmount: number | null;
  publishedAmount: number | null;
  status: 'Belum' | 'Dibayar';
  publishedAt: Date | null;
  paidAt: Date | null;
}

export interface HonorOverview {
  case: CaseInfo;
  totalBilled: number;
  kasPersen: number;
  kas: number;
  fund: number;
  /** Σ draft anggota tim saat ini. */
  draftTotal: number;
  /** Σ published (yang sudah dilihat anggota). */
  publishedTotal: number;
  state: HonorState;
  members: HonorMemberItem[];
}

async function requireCase(db: DbExecutor, caseId: string): Promise<CaseInfo> {
  const found = await getCaseInfo(db, caseId);
  if (!found) throw notFound('Perkara tidak ditemukan');
  return found;
}

async function caseFund(db: DbExecutor, caseId: string) {
  const [totalBilled, settings] = await Promise.all([
    getCaseBilledTotal(db, caseId),
    getFinanceSettings(db),
  ]);
  return {
    totalBilled,
    kasPersen: settings.kasPersen,
    kas: kasShare(totalBilled, settings.kasPersen),
    fund: distributableFund(totalBilled, settings.kasPersen),
  };
}

/** Rincian honor satu perkara untuk Admin (draft + published, kas, dana, state). */
export async function getHonorOverview(
  db: DbExecutor,
  user: AuthContext,
  caseId: string,
): Promise<HonorOverview> {
  ensureCan(user, 'U', 'honor_tim');
  const [theCase, memberIds, rows, money] = await Promise.all([
    requireCase(db, caseId),
    getCaseMemberIds(db, caseId),
    db.select().from(honorTim).where(eq(honorTim.caseId, caseId)),
    caseFund(db, caseId),
  ]);
  const byUser = new Map(rows.map((r) => [r.userId, r]));
  // Anggota tim saat ini + pemilik baris honor yang sudah tidak di tim (tetap terlihat agar bisa diberesi).
  const userIds = [...new Set([...memberIds, ...rows.map((r) => r.userId)])];
  const names = await getUserNames(db, userIds);

  const members: HonorMemberItem[] = userIds.map((userId) => {
    const r = byUser.get(userId);
    return {
      userId,
      fullName: names.get(userId) ?? userId,
      isMember: memberIds.includes(userId),
      draftAmount: r ? r.draftAmount : null,
      publishedAmount: r?.publishedAmount ?? null,
      status: r?.status ?? 'Belum',
      publishedAt: r?.publishedAt ?? null,
      paidAt: r?.paidAt ?? null,
    };
  });

  return {
    case: theCase,
    ...money,
    draftTotal: rows
      .filter((r) => memberIds.includes(r.userId))
      .reduce((s, r) => s + r.draftAmount, 0),
    publishedTotal: rows.reduce((s, r) => s + (r.publishedAmount ?? 0), 0),
    state: honorState(memberIds, rows.map(toRow), money.fund),
    members,
  };
}

export interface HonorCaseListItem {
  case: CaseInfo;
  totalBilled: number;
  kas: number;
  fund: number;
  publishedTotal: number;
  state: HonorState;
}

/** Daftar perkara berpenagihan/berhonor + state honornya (Admin). */
export async function listHonorCases(
  db: DbExecutor,
  user: AuthContext,
  opts: { page?: number; pageSize?: number } = {},
) {
  ensureCan(user, 'U', 'honor_tim');
  const page = Math.max(opts.page ?? 1, 1);
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 1), 100);
  const [{ items, total }, settings] = await Promise.all([
    listBilledCases(db, { limit: pageSize, offset: (page - 1) * pageSize }),
    getFinanceSettings(db),
  ]);
  const ids = items.map((c) => c.id);
  const [memberMap, rows] = await Promise.all([
    getCaseMembersMap(db, ids),
    ids.length ? db.select().from(honorTim).where(inArray(honorTim.caseId, ids)) : [],
  ]);
  const rowsByCase = new Map<string, HonorDbRow[]>();
  for (const r of rows) rowsByCase.set(r.caseId, [...(rowsByCase.get(r.caseId) ?? []), r]);

  const list: HonorCaseListItem[] = items.map((c) => {
    const caseRows = rowsByCase.get(c.id) ?? [];
    const fund = distributableFund(c.totalAmount, settings.kasPersen);
    return {
      case: c,
      totalBilled: c.totalAmount,
      kas: kasShare(c.totalAmount, settings.kasPersen),
      fund,
      publishedTotal: caseRows.reduce((s, r) => s + (r.publishedAmount ?? 0), 0),
      state: honorState(memberMap.get(c.id) ?? [], caseRows.map(toRow), fund),
    };
  });
  return { items: list, total, page, pageSize };
}

/** Simpan draft honor per anggota (Admin). Tidak terlihat anggota sampai didistribusikan. */
export async function saveHonorDraft(
  db: DbExecutor,
  user: AuthContext,
  caseId: string,
  items: readonly { userId: string; amount: number }[],
): Promise<void> {
  ensureCan(user, 'U', 'honor_tim');
  await requireCase(db, caseId);
  await withTx(db, async (tx) => {
    const [memberIds, rows] = await Promise.all([
      getCaseMemberIds(tx, caseId),
      tx.select().from(honorTim).where(eq(honorTim.caseId, caseId)).for('update'),
    ]);
    assertDraftEditable(memberIds, rows.map(toRow), items);
    for (const { userId, amount } of items) {
      await tx
        .insert(honorTim)
        .values({ caseId, userId, draftAmount: amount })
        .onConflictDoUpdate({
          target: [honorTim.caseId, honorTim.userId],
          set: { draftAmount: amount },
        });
    }
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: MODULE,
      entityType: 'case',
      entityId: caseId,
      description: 'Menyimpan draft honor tim',
      metadata: { members: items.length },
    });
  });
}

export interface PublishResult {
  state: HonorState;
  total: number;
  fund: number;
  /** Anggota yang nilai terlihatnya baru/berubah — pemanggil mengirim email (PRD §5.13). */
  changedUserIds: string[];
}

/** Distribusikan honor: validasi PRD §5.9 lalu draft → published untuk seluruh anggota. */
export async function publishHonor(
  db: DbExecutor,
  user: AuthContext,
  caseId: string,
): Promise<PublishResult> {
  ensureCan(user, 'U', 'honor_tim');
  const kase = await requireCase(db, caseId);
  const amounts = new Map<string, number>();
  const result = await withTx(db, async (tx) => {
    const [memberIds, rows, money] = await Promise.all([
      getCaseMemberIds(tx, caseId),
      tx.select().from(honorTim).where(eq(honorTim.caseId, caseId)).for('update'),
      caseFund(tx, caseId),
    ]);
    if (memberIds.length === 0) throw validationError('Perkara belum memiliki anggota tim');

    const plan = planPublish(memberIds, rows.map(toRow), money.fund);
    if (plan.issues.length > 0) {
      const names = await getUserNames(
        tx,
        plan.issues.flatMap((i) => ('userId' in i ? [i.userId] : [])),
      );
      throw validationError(
        plan.issues
          .map((i) =>
            'userId' in i ? `${names.get(i.userId) ?? i.userId}: ${i.message}` : i.message,
          )
          .join('; '),
      );
    }

    if (plan.removeUserIds.length > 0) {
      await tx
        .delete(honorTim)
        .where(and(eq(honorTim.caseId, caseId), inArray(honorTim.userId, plan.removeUserIds)));
    }
    const now = new Date();
    const changedUserIds: string[] = [];
    for (const r of rows) {
      if (!memberIds.includes(r.userId)) continue;
      if (r.publishedAmount !== r.draftAmount) {
        changedUserIds.push(r.userId);
        amounts.set(r.userId, r.draftAmount);
      }
      await tx
        .update(honorTim)
        .set({ publishedAmount: r.draftAmount, publishedAt: now })
        .where(eq(honorTim.id, r.id));
    }
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'publish',
      module: MODULE,
      entityType: 'case',
      entityId: caseId,
      description: 'Mendistribusikan honor tim',
      metadata: { total: plan.total, fund: money.fund, changed: changedUserIds.length },
    });
    return { state: 'Terdistribusi' as const, total: plan.total, fund: money.fund, changedUserIds };
  });
  // Sesudah commit: email gagal tidak membatalkan distribusi (PRD §5.13).
  await Promise.all(
    result.changedUserIds.map((recipientUserId) =>
      notify(db, {
        type: 'honor_publish',
        recipientUserId,
        data: { caseId, caseTitle: kase.title, amount: amounts.get(recipientUserId) ?? 0 },
      }).catch(() => undefined),
    ),
  );
  return result;
}

/** Tandai honor satu anggota Dibayar / batalkan. Hanya yang sudah didistribusikan. */
export async function setHonorPaid(
  db: DbExecutor,
  user: AuthContext,
  caseId: string,
  userId: string,
  paid: boolean,
): Promise<void> {
  ensureCan(user, 'U', 'honor_tim');
  await withTx(db, async (tx) => {
    const [row] = await tx
      .select()
      .from(honorTim)
      .where(and(eq(honorTim.caseId, caseId), eq(honorTim.userId, userId)))
      .for('update');
    if (!row) throw notFound('Honor anggota tidak ditemukan');
    if (row.publishedAmount === null) {
      throw conflict('Honor belum didistribusikan sehingga belum dapat ditandai Dibayar');
    }
    await tx
      .update(honorTim)
      .set(paid ? { status: 'Dibayar', paidAt: new Date() } : { status: 'Belum', paidAt: null })
      .where(eq(honorTim.id, row.id));
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: paid ? 'honor_paid' : 'honor_unpaid',
      module: MODULE,
      entityType: 'honor',
      entityId: row.id,
      description: paid ? 'Menandai honor Dibayar' : 'Membatalkan status honor Dibayar',
      metadata: { caseId, userId, amount: row.publishedAmount },
    });
  });
}

export interface MyHonorItem {
  caseId: string;
  regNo: string | null;
  title: string | null;
  amount: number;
  status: 'Belum' | 'Dibayar';
  publishedAt: Date | null;
  paidAt: Date | null;
}

/**
 * "Honor saya": hanya nilai published milik user sendiri. `draft_amount` tidak pernah
 * di-select di fungsi ini, sehingga draft tidak mungkin bocor ke anggota.
 */
export async function listMyHonor(db: DbExecutor, user: AuthContext): Promise<MyHonorItem[]> {
  ensureCan(user, 'R', 'honor_tim');
  const rows = await db
    .select({
      caseId: honorTim.caseId,
      amount: honorTim.publishedAmount,
      status: honorTim.status,
      publishedAt: honorTim.publishedAt,
      paidAt: honorTim.paidAt,
    })
    .from(honorTim)
    .where(and(eq(honorTim.userId, user.userId), isNotNull(honorTim.publishedAmount)))
    .orderBy(desc(honorTim.publishedAt));
  const infos = await getCaseInfos(db, [...new Set(rows.map((r) => r.caseId))]);
  return rows.flatMap((r) =>
    r.amount === null
      ? []
      : [
          {
            caseId: r.caseId,
            regNo: infos.get(r.caseId)?.regNo ?? null,
            title: infos.get(r.caseId)?.title ?? null,
            amount: r.amount,
            status: r.status,
            publishedAt: r.publishedAt,
            paidAt: r.paidAt,
          },
        ],
  );
}

// ── F5: kas kantor ─────────────────────────────────────────────────────────

export interface KasSummary {
  kasPersen: number;
  totalBilled: number;
  /** Σ kas per perkara (tiap perkara dibulatkan sendiri, konsisten dengan dana distribusinya). */
  totalKas: number;
  totalFund: number;
  /** Σ honor yang sudah didistribusikan. */
  distributed: number;
  cases: { caseId: string; regNo: string; title: string; totalBilled: number; kas: number }[];
}

/** Hak lihat kas: Admin atau user di `kas_viewers`; selain itu FORBIDDEN. */
export async function assertCanViewKas(db: DbExecutor, user: AuthContext): Promise<void> {
  const settings = await getFinanceSettings(db);
  if (!canViewKas(user, settings.kasViewers))
    throw forbidden('Anda tidak berhak melihat kas kantor');
}

export async function canUserViewKas(db: DbExecutor, user: AuthContext): Promise<boolean> {
  const settings = await getFinanceSettings(db);
  return canViewKas(user, settings.kasViewers);
}

export async function getKasSummary(db: DbExecutor, user: AuthContext): Promise<KasSummary> {
  const settings = await getFinanceSettings(db);
  if (!canViewKas(user, settings.kasViewers))
    throw forbidden('Anda tidak berhak melihat kas kantor');

  const [{ items }, [distributed]] = await Promise.all([
    listBilledCases(db, { limit: 5000, offset: 0 }),
    db.select({ value: sql<string>`coalesce(sum(${honorTim.publishedAmount}), 0)` }).from(honorTim),
  ]);
  const withKas = items
    .filter((c) => c.totalAmount > 0)
    .map((c) => ({
      caseId: c.id,
      regNo: c.regNo,
      title: c.title,
      totalBilled: c.totalAmount,
      kas: kasShare(c.totalAmount, settings.kasPersen),
    }));
  const totalBilled = withKas.reduce((s, c) => s + c.totalBilled, 0);
  const totalKas = withKas.reduce((s, c) => s + c.kas, 0);
  return {
    kasPersen: settings.kasPersen,
    totalBilled,
    totalKas,
    totalFund: totalBilled - totalKas,
    distributed: Number(distributed?.value ?? 0),
    cases: withKas.sort((a, b) => b.kas - a.kas).slice(0, 200),
  };
}
