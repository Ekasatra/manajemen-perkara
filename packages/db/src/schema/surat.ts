import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { lower, timestamps } from './_helpers';
import { cases } from './cases';
import { approvalAction, suratKeluarJenis, suratKeluarStatus, suratMasukStatus } from './enums';
import { profiles } from './identity';

export const suratMasuk = pgTable(
  'surat_masuk',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** `SM/{tahun}/{0001}` dari next_counter. */
    noAgenda: text('no_agenda').notNull().unique(),
    /** Nomor surat asal (bila ada). */
    noSurat: text('no_surat'),
    sender: text('sender').notNull(),
    subject: text('subject').notNull(),
    tglSurat: date('tgl_surat', { mode: 'string' }),
    tglTerima: date('tgl_terima', { mode: 'string' }).notNull().defaultNow(),
    sifat: text('sifat').notNull().default('Biasa'),
    status: suratMasukStatus('status').notNull().default('Belum'),
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'set null' }),
    assignedTo: uuid('assigned_to').references(() => profiles.id, { onDelete: 'set null' }),
    disposisiNote: text('disposisi_note'),
    /** Path di bucket `surat`. */
    filePath: text('file_path'),
    fileName: text('file_name'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('surat_masuk_status_idx').on(t.status),
    index('surat_masuk_case_idx').on(t.caseId),
    index('surat_masuk_assigned_idx').on(t.assignedTo),
    index('surat_masuk_tgl_terima_idx').on(t.tglTerima),
  ],
);

export const suratKeluar = pgTable(
  'surat_keluar',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    noSurat: text('no_surat').notNull(),
    tglSurat: date('tgl_surat', { mode: 'string' }).notNull(),
    kepada: text('kepada').notNull(),
    perihal: text('perihal').notNull(),
    jenis: suratKeluarJenis('jenis').notNull(),
    // RESTRICT: jenis Perkara wajib punya perkara, jadi perkara berisi surat tak boleh dihapus.
    caseId: uuid('case_id').references(() => cases.id, { onDelete: 'restrict' }),
    status: suratKeluarStatus('status').notNull().default('Draft'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    reviewerId: uuid('reviewer_id').references(() => profiles.id, { onDelete: 'set null' }),
    signerId: uuid('signer_id').references(() => profiles.id, { onDelete: 'set null' }),
    /** Path di bucket `surat`. Wajib sejak Draft. */
    filePath: text('file_path').notNull(),
    fileName: text('file_name'),
    signedFilePath: text('signed_file_path'),
    signedAt: timestamp('signed_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    sentToEmail: text('sent_to_email'),
    notes: text('notes'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('surat_keluar_no_surat_lower_uq').on(lower(t.noSurat)),
    check(
      'surat_keluar_perkara_needs_case',
      sql`${t.jenis} <> 'Perkara' or ${t.caseId} is not null`,
    ),
    index('surat_keluar_status_idx').on(t.status),
    index('surat_keluar_case_idx').on(t.caseId),
    index('surat_keluar_created_by_idx').on(t.createdBy),
    index('surat_keluar_reviewer_idx').on(t.reviewerId),
    index('surat_keluar_signer_idx').on(t.signerId),
  ],
);

export const suratApprovalLogs = pgTable(
  'surat_approval_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    suratId: uuid('surat_id')
      .notNull()
      .references(() => suratKeluar.id, { onDelete: 'cascade' }),
    action: approvalAction('action').notNull(),
    actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
    actorName: text('actor_name'),
    fromStatus: suratKeluarStatus('from_status'),
    toStatus: suratKeluarStatus('to_status'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('surat_approval_logs_surat_idx').on(t.suratId, t.createdAt)],
);

export const templates = pgTable(
  'templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    category: text('category').notNull(),
    description: text('description'),
    /** Path di bucket `templates`. */
    filePath: text('file_path').notNull(),
    fileName: text('file_name'),
    fileSize: bigint('file_size', { mode: 'number' }),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [index('templates_category_idx').on(t.category)],
);
