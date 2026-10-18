/**
 * Service invoice (Agent F · F1, F2, F6). Hak akses lewat `ensureCan` kernel (invoice = Admin).
 * Kolom `status` generated oleh DB dari paid_amount, jadi tidak pernah ditulis di sini.
 */
import { and, count, desc, eq, gte, lte, ne, sql, type SQL } from 'drizzle-orm';
import { invoices } from '@ekasatra/db';
import { conflict, notFound, validationError } from '@ekasatra/shared';
import type {
  CreateInvoiceInput,
  InvoiceStatus,
  ListInvoicesQuery,
  MarkPaidInput,
  RecordPaymentInput,
  UpdateInvoiceInput,
} from '@ekasatra/shared/invoices';
import type { AuthContext } from '../kernel/auth';
import { logActivity } from '../kernel/activity';
import { nextCounter, withTx, type DbExecutor } from '../kernel/db-helpers';
import { ensureCan } from '../kernel/policy';
import { getCaseInfo, getCaseInfos, getClientNames } from '../finance/deps';
import { formatDocNo, todayWIB } from '../finance/money';
import { applyAmountChange, applyMarkPaid, applyPayment } from './rules';

export type InvoiceRow = typeof invoices.$inferSelect;

export interface InvoiceListItem extends InvoiceRow {
  clientName: string | null;
  caseRegNo: string | null;
  caseTitle: string | null;
}

const MODULE = 'invoices';

async function withNames(db: DbExecutor, rows: InvoiceRow[]): Promise<InvoiceListItem[]> {
  const caseIds = [...new Set(rows.flatMap((r) => (r.caseId ? [r.caseId] : [])))];
  const clientIds = [...new Set(rows.flatMap((r) => (r.clientId ? [r.clientId] : [])))];
  const [caseMap, clientMap] = await Promise.all([
    getCaseInfos(db, caseIds),
    getClientNames(db, clientIds),
  ]);
  return rows.map((r) => ({
    ...r,
    clientName: r.clientId ? (clientMap.get(r.clientId) ?? null) : null,
    caseRegNo: r.caseId ? (caseMap.get(r.caseId)?.regNo ?? null) : null,
    caseTitle: r.caseId ? (caseMap.get(r.caseId)?.title ?? null) : null,
  }));
}

/** Klien diturunkan dari perkara bila tidak diisi; bila keduanya diisi harus cocok. */
async function resolveParties(
  db: DbExecutor,
  clientId: string | null | undefined,
  caseId: string | null | undefined,
): Promise<{ clientId: string | null; caseId: string | null }> {
  let resolvedClient = clientId ?? null;
  if (caseId) {
    const found = await getCaseInfo(db, caseId);
    if (!found) throw notFound('Perkara tidak ditemukan');
    if (resolvedClient && resolvedClient !== found.clientId) {
      throw validationError('Klien tidak sesuai dengan klien perkara');
    }
    resolvedClient = found.clientId;
  } else if (resolvedClient) {
    const names = await getClientNames(db, [resolvedClient]);
    if (!names.has(resolvedClient)) throw notFound('Klien tidak ditemukan');
  }
  if (!resolvedClient && !caseId) throw validationError('Klien atau perkara wajib diisi');
  return { clientId: resolvedClient, caseId: caseId ?? null };
}

function assertDueAfterInvoice(invoiceDate: string, dueDate: string | null) {
  if (dueDate && dueDate < invoiceDate) {
    throw validationError('Jatuh tempo tidak boleh sebelum tanggal invoice');
  }
}

async function lockInvoice(tx: DbExecutor, id: string): Promise<InvoiceRow> {
  const [row] = await tx.select().from(invoices).where(eq(invoices.id, id)).for('update');
  if (!row) throw notFound('Invoice tidak ditemukan');
  return row;
}

// ── F1 ─────────────────────────────────────────────────────────────────────

export async function createInvoice(
  db: DbExecutor,
  user: AuthContext,
  input: CreateInvoiceInput,
): Promise<InvoiceRow> {
  ensureCan(user, 'C', 'invoices');
  const today = todayWIB();
  const invoiceDate = input.invoiceDate ?? today;
  const dueDate = input.dueDate ?? null;
  assertDueAfterInvoice(invoiceDate, dueDate);

  return withTx(db, async (tx) => {
    const parties = await resolveParties(tx, input.clientId, input.caseId);
    // Nomor per tahun kalender WIB saat dibuat; counter ikut batal bila transaksi gagal.
    const year = Number(today.slice(0, 4));
    const invoiceNo = formatDocNo('INV', year, await nextCounter(tx, `INV/${year}`));
    const [row] = await tx
      .insert(invoices)
      .values({
        invoiceNo,
        ...parties,
        description: input.description ?? null,
        amount: input.amount,
        invoiceDate,
        dueDate,
        createdBy: user.userId,
      })
      .returning();
    if (!row) throw new Error('Insert invoice tidak mengembalikan baris');
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'create',
      module: MODULE,
      entityType: 'invoice',
      entityId: row.id,
      description: `Membuat invoice ${invoiceNo}`,
      metadata: { amount: row.amount },
    });
    return row;
  });
}

export async function getInvoice(
  db: DbExecutor,
  user: AuthContext,
  id: string,
): Promise<InvoiceListItem> {
  ensureCan(user, 'R', 'invoices');
  const [row] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!row) throw notFound('Invoice tidak ditemukan');
  const [item] = await withNames(db, [row]);
  return item as InvoiceListItem;
}

function filters(q: Pick<ListInvoicesQuery, 'status' | 'clientId' | 'caseId' | 'from' | 'to'>) {
  const conds: SQL[] = [];
  if (q.status) conds.push(eq(invoices.status, q.status));
  if (q.clientId) conds.push(eq(invoices.clientId, q.clientId));
  if (q.caseId) conds.push(eq(invoices.caseId, q.caseId));
  if (q.from) conds.push(gte(invoices.invoiceDate, q.from));
  if (q.to) conds.push(lte(invoices.invoiceDate, q.to));
  return conds.length ? and(...conds) : undefined;
}

export async function listInvoices(db: DbExecutor, user: AuthContext, query: ListInvoicesQuery) {
  ensureCan(user, 'R', 'invoices');
  const where = filters(query);
  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.invoiceDate), desc(invoices.createdAt))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize),
    db.select({ value: count() }).from(invoices).where(where),
  ]);
  return {
    items: await withNames(db, rows),
    total: total?.value ?? 0,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function updateInvoice(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  input: UpdateInvoiceInput,
): Promise<InvoiceRow> {
  ensureCan(user, 'U', 'invoices');
  return withTx(db, async (tx) => {
    const current = await lockInvoice(tx, id);

    const touchesParties = input.clientId !== undefined || input.caseId !== undefined;
    const caseId = input.caseId !== undefined ? input.caseId : current.caseId;
    // Ganti perkara tanpa menyebut klien → klien ikut perkara baru; selain itu klien lama dipertahankan.
    const clientId =
      input.clientId !== undefined
        ? input.clientId
        : input.caseId !== undefined && input.caseId !== null
          ? null
          : current.clientId;
    const parties = touchesParties
      ? await resolveParties(tx, clientId, caseId)
      : { clientId: current.clientId, caseId: current.caseId };

    const invoiceDate = input.invoiceDate ?? current.invoiceDate;
    const dueDate = input.dueDate !== undefined ? input.dueDate : current.dueDate;
    assertDueAfterInvoice(invoiceDate, dueDate);

    const paid = applyAmountChange(
      { amount: current.amount, paidAmount: current.paidAmount, paidDate: current.paidDate },
      input.amount ?? current.amount,
      todayWIB(),
    );

    const [row] = await tx
      .update(invoices)
      .set({
        ...parties,
        description: input.description !== undefined ? input.description : current.description,
        amount: paid.amount,
        paidDate: paid.paidDate,
        invoiceDate,
        dueDate,
      })
      .where(eq(invoices.id, id))
      .returning();
    if (!row) throw notFound('Invoice tidak ditemukan');
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'update',
      module: MODULE,
      entityType: 'invoice',
      entityId: id,
      description: `Mengubah invoice ${row.invoiceNo}`,
      metadata: { amountBefore: current.amount, amountAfter: row.amount },
    });
    return row;
  });
}

export async function deleteInvoice(db: DbExecutor, user: AuthContext, id: string): Promise<void> {
  ensureCan(user, 'D', 'invoices');
  await withTx(db, async (tx) => {
    const current = await lockInvoice(tx, id);
    if (current.paidAmount > 0) {
      throw conflict('Invoice sudah memiliki pembayaran dan tidak dapat dihapus');
    }
    await tx.delete(invoices).where(eq(invoices.id, id));
    await logActivity(tx, {
      userId: user.userId,
      userName: user.fullName,
      action: 'delete',
      module: MODULE,
      entityType: 'invoice',
      entityId: id,
      description: `Menghapus invoice ${current.invoiceNo}`,
    });
  });
}

// ── F2 ─────────────────────────────────────────────────────────────────────

async function savePaid(
  tx: DbExecutor,
  user: AuthContext,
  current: InvoiceRow,
  next: { paidAmount: number; paidDate: string | null },
  action: 'payment' | 'mark_paid',
  description: string,
  metadata: Record<string, unknown>,
): Promise<InvoiceRow> {
  const [row] = await tx
    .update(invoices)
    .set({ paidAmount: next.paidAmount, paidDate: next.paidDate })
    .where(eq(invoices.id, current.id))
    .returning();
  if (!row) throw notFound('Invoice tidak ditemukan');
  await logActivity(tx, {
    userId: user.userId,
    userName: user.fullName,
    action,
    module: MODULE,
    entityType: 'invoice',
    entityId: current.id,
    description,
    metadata: { ...metadata, paidBefore: current.paidAmount, paidAfter: row.paidAmount },
  });
  return row;
}

/** Catat pembayaran (cicilan/pelunasan): paid_amount bertambah, status & paid_date mengikuti. */
export async function recordPayment(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  input: RecordPaymentInput,
): Promise<InvoiceRow> {
  ensureCan(user, 'U', 'invoices');
  return withTx(db, async (tx) => {
    const current = await lockInvoice(tx, id);
    const next = applyPayment(current, input.amount, input.paidDate ?? todayWIB());
    return savePaid(
      tx,
      user,
      current,
      next,
      'payment',
      `Pembayaran ${input.amount} untuk invoice ${current.invoiceNo}`,
      { amount: input.amount },
    );
  });
}

/** Tandai Lunas: paid_amount = amount, paid_date = tanggal bayar (default hari ini WIB). */
export async function markPaid(
  db: DbExecutor,
  user: AuthContext,
  id: string,
  input: MarkPaidInput = {},
): Promise<InvoiceRow> {
  ensureCan(user, 'U', 'invoices');
  return withTx(db, async (tx) => {
    const current = await lockInvoice(tx, id);
    const next = applyMarkPaid(current, input.paidDate ?? todayWIB());
    return savePaid(
      tx,
      user,
      current,
      next,
      'mark_paid',
      `Invoice ${current.invoiceNo} ditandai Lunas`,
      {},
    );
  });
}

// ── F6: fungsi baca untuk Insight (Agent G) ────────────────────────────────

const REPORT_LIMIT = 5000;

/** Seluruh invoice yang cocok filter (tanpa paginasi, maks 5.000) untuk laporan/ekspor. */
export async function listInvoicesForReport(
  db: DbExecutor,
  user: AuthContext,
  filter: { from?: string; to?: string; status?: InvoiceStatus; clientId?: string } = {},
): Promise<InvoiceListItem[]> {
  ensureCan(user, 'R', 'invoices');
  const rows = await db
    .select()
    .from(invoices)
    .where(filters(filter))
    .orderBy(invoices.invoiceDate, invoices.invoiceNo)
    .limit(REPORT_LIMIT);
  return withNames(db, rows);
}

export interface OutstandingSummary {
  invoiceCount: number;
  totalAmount: number;
  totalPaid: number;
  /** Piutang = Σ max(amount − paid, 0). */
  outstanding: number;
  byStatus: Record<InvoiceStatus, number>;
  overdue: { count: number; outstanding: number };
  dueSoon: {
    id: string;
    invoiceNo: string;
    dueDate: string;
    outstanding: number;
    clientId: string | null;
    caseId: string | null;
  }[];
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Ringkasan piutang untuk dashboard/laporan; `dueSoon` = invoice belum lunas jatuh tempo ≤ N hari. */
export async function outstandingSummary(
  db: DbExecutor,
  user: AuthContext,
  opts: { today?: string; dueInDays?: number } = {},
): Promise<OutstandingSummary> {
  ensureCan(user, 'R', 'invoices');
  const today = opts.today ?? todayWIB();
  const until = addDays(today, opts.dueInDays ?? 14);
  const open = ne(invoices.status, 'Lunas');
  const owed = sql<number>`greatest(${invoices.amount} - ${invoices.paidAmount}, 0)`;

  const [[totals], statusRows, [overdue], dueSoon] = await Promise.all([
    db
      .select({
        invoiceCount: count(),
        totalAmount: sql<string>`coalesce(sum(${invoices.amount}), 0)`,
        totalPaid: sql<string>`coalesce(sum(${invoices.paidAmount}), 0)`,
        outstanding: sql<string>`coalesce(sum(${owed}), 0)`,
      })
      .from(invoices),
    db.select({ status: invoices.status, value: count() }).from(invoices).groupBy(invoices.status),
    db
      .select({
        count: count(),
        outstanding: sql<string>`coalesce(sum(${owed}), 0)`,
      })
      .from(invoices)
      .where(and(open, sql`${invoices.dueDate} < ${today}`)),
    db
      .select({
        id: invoices.id,
        invoiceNo: invoices.invoiceNo,
        dueDate: invoices.dueDate,
        amount: invoices.amount,
        paidAmount: invoices.paidAmount,
        clientId: invoices.clientId,
        caseId: invoices.caseId,
      })
      .from(invoices)
      .where(and(open, gte(invoices.dueDate, today), lte(invoices.dueDate, until)))
      .orderBy(invoices.dueDate)
      .limit(10),
  ]);

  const byStatus: Record<InvoiceStatus, number> = {
    'Belum Bayar': 0,
    'Sudah Bayar Sebagian': 0,
    Lunas: 0,
  };
  for (const r of statusRows) byStatus[r.status] = r.value;

  return {
    invoiceCount: totals?.invoiceCount ?? 0,
    totalAmount: Number(totals?.totalAmount ?? 0),
    totalPaid: Number(totals?.totalPaid ?? 0),
    outstanding: Number(totals?.outstanding ?? 0),
    byStatus,
    overdue: { count: overdue?.count ?? 0, outstanding: Number(overdue?.outstanding ?? 0) },
    dueSoon: dueSoon.flatMap((r) =>
      r.dueDate
        ? [
            {
              id: r.id,
              invoiceNo: r.invoiceNo,
              dueDate: r.dueDate,
              outstanding: Math.max(r.amount - r.paidAmount, 0),
              clientId: r.clientId,
              caseId: r.caseId,
            },
          ]
        : [],
    ),
  };
}
