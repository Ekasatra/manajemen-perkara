import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { invoices, honorTim, cases, profiles, clients } from '@ekasatra/db';
import type { DbExecutor } from '../kernel/db-helpers';
import type {
  HonorariumReportFilter,
  HonorariumReportItem,
  PortalInvoiceItem,
  DashboardPiutangSummary,
  DashboardTenggatItem,
} from '@ekasatra/shared';

export interface InvoiceReportFilter {
  startDate?: string;
  endDate?: string;
  status?: string;
  clientId?: string;
  caseId?: string;
}

export interface InvoiceReportItem {
  id: string;
  invoiceNo: string;
  clientName?: string | null;
  caseTitle?: string | null;
  description?: string | null;
  amount: number;
  paidAmount: number;
  outstanding: number;
  status: string;
  invoiceDate: string;
  dueDate?: string | null;
  paidDate?: string | null;
}

/**
 * Fungsi baca untuk Insight (TASKS.md F6): listInvoicesForReport.
 */
export async function listInvoicesForReport(
  db: DbExecutor,
  filter?: InvoiceReportFilter,
): Promise<InvoiceReportItem[]> {
  const conditions = [];

  if (filter?.startDate) {
    conditions.push(gte(invoices.invoiceDate, filter.startDate));
  }
  if (filter?.endDate) {
    conditions.push(lte(invoices.invoiceDate, filter.endDate));
  }
  if (filter?.status) {
    conditions.push(eq(invoices.status, filter.status as any));
  }
  if (filter?.clientId) {
    conditions.push(eq(invoices.clientId, filter.clientId));
  }
  if (filter?.caseId) {
    conditions.push(eq(invoices.caseId, filter.caseId));
  }

  const query = db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      clientName: clients.name,
      caseTitle: cases.title,
      description: invoices.description,
      amount: invoices.amount,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
      paidDate: invoices.paidDate,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(cases, eq(invoices.caseId, cases.id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = whereClause
    ? await query.where(whereClause).orderBy(desc(invoices.invoiceDate))
    : await query.orderBy(desc(invoices.invoiceDate));

  return rows.map((r) => ({
    ...r,
    outstanding: Math.max(0, r.amount - r.paidAmount),
  }));
}

/**
 * Fungsi baca untuk Insight (TASKS.md F6): outstandingSummary.
 * Hanya mengembalikan angka jika user berhak (Admin / canViewInvoices).
 */
export async function outstandingSummary(
  db: DbExecutor,
  canViewInvoices: boolean,
): Promise<DashboardPiutangSummary> {
  if (!canViewInvoices) {
    return {
      authorized: false,
      totalOutstanding: null,
      invoiceCount: null,
    };
  }

  const rows = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      totalAmount: sql<number>`coalesce(cast(sum(${invoices.amount}) as bigint), 0)`,
      paidAmount: sql<number>`coalesce(cast(sum(${invoices.paidAmount}) as bigint), 0)`,
    })
    .from(invoices)
    .where(sql`${invoices.paidAmount} < ${invoices.amount}`);

  const item = rows[0];
  const count = item?.count ?? 0;
  const total = Number(item?.totalAmount ?? 0);
  const paid = Number(item?.paidAmount ?? 0);
  const totalOutstanding = Math.max(0, total - paid);

  return {
    authorized: true,
    totalOutstanding,
    invoiceCount: count,
  };
}

/**
 * Tenggat invoice jatuh tempo dalam 14 hari ke depan (PRD §5.10).
 */
export async function getTenggat14HariInvoices(
  db: DbExecutor,
  todayStr: string,
  deadline14Str: string,
  canViewInvoices: boolean,
): Promise<DashboardTenggatItem[]> {
  if (!canViewInvoices) return [];

  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      amount: invoices.amount,
      paidAmount: invoices.paidAmount,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .where(
      and(
        gte(invoices.dueDate, todayStr),
        lte(invoices.dueDate, deadline14Str),
        sql`${invoices.paidAmount} < ${invoices.amount}`,
      ),
    );

  const todayMs = new Date(todayStr).getTime();
  const items: DashboardTenggatItem[] = [];

  for (const row of rows) {
    if (!row.dueDate) continue;
    const dueMs = new Date(row.dueDate).getTime();
    const daysLeft = Math.ceil((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    const outstanding = Math.max(0, row.amount - row.paidAmount);
    items.push({
      id: `invoice-${row.id}`,
      type: 'invoice',
      title: `Jatuh Tempo Invoice ${row.invoiceNo}`,
      targetDate: row.dueDate,
      daysLeft,
      extraInfo: `Sisa: Rp ${outstanding.toLocaleString('id-ID')}`,
      link: `/invoices/${row.id}`,
    });
  }

  return items;
}

/**
 * Daftar honor tim untuk Laporan Honorarium (Admin) (PRD §5.11).
 */
export async function listHonorariumForReport(
  db: DbExecutor,
  filter?: HonorariumReportFilter,
): Promise<HonorariumReportItem[]> {
  const conditions = [];

  if (filter?.startDate) {
    conditions.push(gte(honorTim.createdAt, new Date(filter.startDate)));
  }
  if (filter?.endDate) {
    conditions.push(lte(honorTim.createdAt, new Date(filter.endDate)));
  }
  if (filter?.status) {
    conditions.push(eq(honorTim.status, filter.status as any));
  }
  if (filter?.caseId) {
    conditions.push(eq(honorTim.caseId, filter.caseId));
  }
  if (filter?.userId) {
    conditions.push(eq(honorTim.userId, filter.userId));
  }

  const query = db
    .select({
      id: honorTim.id,
      caseTitle: cases.title,
      userName: profiles.fullName,
      draftAmount: honorTim.draftAmount,
      publishedAmount: honorTim.publishedAmount,
      status: honorTim.status,
      publishedAt: sql<string | null>`cast(${honorTim.publishedAt} as text)`,
      paidAt: sql<string | null>`cast(${honorTim.paidAt} as text)`,
    })
    .from(honorTim)
    .innerJoin(cases, eq(honorTim.caseId, cases.id))
    .innerJoin(profiles, eq(honorTim.userId, profiles.id));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return whereClause
    ? query.where(whereClause).orderBy(desc(honorTim.createdAt))
    : query.orderBy(desc(honorTim.createdAt));
}

/**
 * Daftar tagihan (invoices) untuk Portal Klien (PRD §5.12).
 * Klien dapat melihat tagihan yang terkait langsung dengan dirinya atau perkaranya.
 */
export async function getClientInvoicesForPortal(
  db: DbExecutor,
  clientId: string,
): Promise<PortalInvoiceItem[]> {
  const rows = await db
    .select({
      id: invoices.id,
      invoiceNo: invoices.invoiceNo,
      description: invoices.description,
      amount: invoices.amount,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      invoiceDate: invoices.invoiceDate,
      dueDate: invoices.dueDate,
    })
    .from(invoices)
    .leftJoin(cases, eq(invoices.caseId, cases.id))
    .where(
      sql`${invoices.clientId} = ${clientId} or ${cases.clientId} = ${clientId}`,
    )
    .orderBy(desc(invoices.invoiceDate));

  return rows;
}
