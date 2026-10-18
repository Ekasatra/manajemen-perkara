/**
 * Skema validasi modul invoices (Agent F · F1–F2). PRD §5.8.
 * Uang = integer rupiah. Status TIDAK bisa diisi klien: dihitung dari paid_amount.
 */
import { z } from 'zod';

export const INVOICE_STATUSES = ['Belum Bayar', 'Sudah Bayar Sebagian', 'Lunas'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

const rupiah = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const isoDate = z.iso.date();

export const createInvoiceSchema = z
  .object({
    clientId: z.uuid().optional(),
    caseId: z.uuid().optional(),
    description: z.string().trim().max(2000).optional(),
    amount: rupiah,
    invoiceDate: isoDate.optional(),
    dueDate: isoDate.optional(),
  })
  .refine((v) => v.clientId || v.caseId, {
    message: 'Klien atau perkara wajib diisi',
    path: ['clientId'],
  });
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z.object({
  clientId: z.uuid().nullable().optional(),
  caseId: z.uuid().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  amount: rupiah.optional(),
  invoiceDate: isoDate.optional(),
  dueDate: isoDate.nullable().optional(),
});
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

/** Catat pembayaran = menambah paid_amount sebesar `amount`. */
export const recordPaymentSchema = z.object({
  amount: rupiah,
  paidDate: isoDate.optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const markPaidSchema = z.object({ paidDate: isoDate.optional() });
export type MarkPaidInput = z.infer<typeof markPaidSchema>;

export const listInvoicesQuerySchema = z.object({
  status: z.enum(INVOICE_STATUSES).optional(),
  clientId: z.uuid().optional(),
  caseId: z.uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
