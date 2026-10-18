import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgTable,
  pgView,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_helpers';
import { cases } from './cases';
import { honorStatus } from './enums';
import { profiles } from './identity';
import { clients } from './master';

// Uang = rupiah bulat. bigint (bukan integer) agar aman melewati 2,1 miliar.
const rupiah = (name: string) => bigint(name, { mode: 'number' });

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** `INV/{tahun}/{0001}` dari next_counter. */
    invoiceNo: text('invoice_no').notNull().unique(),
    // RESTRICT: data keuangan tidak ikut hilang saat klien/perkara dihapus.
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'restrict' }),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'restrict' }),
    description: text('description'),
    amount: rupiah('amount').notNull(),
    paidAmount: rupiah('paid_amount').notNull().default(0),
    invoiceDate: date('invoice_date', { mode: 'string' }).notNull().defaultNow(),
    dueDate: date('due_date', { mode: 'string' }),
    paidDate: date('paid_date', { mode: 'string' }),
    // Turunan dari paid_amount, tidak bisa diisi manual. text, bukan enum: cast ke enum tidak IMMUTABLE.
    status: text('status')
      .$type<'Belum Bayar' | 'Sudah Bayar Sebagian' | 'Lunas'>()
      .notNull()
      .generatedAlwaysAs(
        sql`(case when paid_amount <= 0 then 'Belum Bayar' when paid_amount < amount then 'Sudah Bayar Sebagian' else 'Lunas' end)`,
      ),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    check('invoices_amount_positive', sql`${t.amount} > 0`),
    check('invoices_paid_nonneg', sql`${t.paidAmount} >= 0`),
    check('invoices_client_or_case', sql`${t.clientId} is not null or ${t.caseId} is not null`),
    index('invoices_client_idx').on(t.clientId),
    index('invoices_case_idx').on(t.caseId),
    index('invoices_status_idx').on(t.status),
    index('invoices_date_idx').on(t.invoiceDate),
  ],
);

export const honorTim = pgTable(
  'honor_tim',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    /** Nilai kerja Admin. Anggota hanya boleh melihat published_amount. */
    draftAmount: rupiah('draft_amount').notNull().default(0),
    /** NULL = belum pernah didistribusikan. Berubah bila draft_amount ≠ published_amount. */
    publishedAmount: rupiah('published_amount'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    status: honorStatus('status').notNull().default('Belum'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique('honor_tim_case_user_uq').on(t.caseId, t.userId),
    check('honor_tim_draft_nonneg', sql`${t.draftAmount} >= 0`),
    check(
      'honor_tim_published_nonneg',
      sql`${t.publishedAmount} is null or ${t.publishedAmount} >= 0`,
    ),
    index('honor_tim_user_idx').on(t.userId),
    index('honor_tim_status_idx').on(t.status),
  ],
);

/** Dibuat di migrasi SQL kustom; di sini hanya untuk tipe query. */
export const vCaseBilling = pgView('v_case_billing', {
  caseId: uuid('case_id').notNull(),
  invoiceCount: integer('invoice_count').notNull(),
  totalAmount: rupiah('total_amount').notNull(),
  paidAmount: rupiah('paid_amount').notNull(),
  outstandingAmount: rupiah('outstanding_amount').notNull(),
}).existing();
