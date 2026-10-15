import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { timestamps } from './_helpers';
import { caseMemberRole, caseStatus, timelineEventType } from './enums';
import { profiles } from './identity';
import { clients, opponents } from './master';

export const cases = pgTable(
  'cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** `REG/{tahun}/{0001}` dari next_counter. */
    regNo: text('reg_no').notNull().unique(),
    title: text('title').notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    opponentId: uuid('opponent_id').references(() => opponents.id, { onDelete: 'set null' }),
    /** Nomor perkara di pengadilan. */
    caseNumber: text('case_number'),
    court: text('court'),
    caseType: text('case_type'),
    description: text('description'),
    status: caseStatus('status').notNull().default('Aktif'),
    startDate: date('start_date', { mode: 'string' }),
    putusDate: date('putus_date', { mode: 'string' }),
    upayaDeadline: date('upaya_deadline', { mode: 'string' }),
    closedDate: date('closed_date', { mode: 'string' }),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('cases_client_id_idx').on(t.clientId),
    index('cases_status_idx').on(t.status),
    index('cases_created_by_idx').on(t.createdBy),
    index('cases_upaya_deadline_idx').on(t.upayaDeadline),
  ],
);

export const caseMembers = pgTable(
  'case_members',
  {
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    peran: caseMemberRole('peran').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.caseId, t.userId, t.peran] }),
    // Satu manager per perkara.
    uniqueIndex('case_members_one_manager_uq')
      .on(t.caseId)
      .where(sql`${t.peran} = 'Manager'`),
    index('case_members_user_idx').on(t.userId),
  ],
);

export const caseTimeline = pgTable(
  'case_timeline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    eventType: timelineEventType('event_type').notNull().default('Catatan'),
    eventDate: date('event_date', { mode: 'string' }).notNull().defaultNow(),
    title: text('title').notNull(),
    description: text('description'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('case_timeline_case_idx').on(t.caseId, t.eventDate.desc())],
);

export const caseSchedules = pgTable(
  'case_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    scheduleDate: date('schedule_date', { mode: 'string' }).notNull(),
    scheduleTime: time('schedule_time'),
    kind: text('kind').notNull().default('Sidang'),
    location: text('location'),
    notes: text('notes'),
    status: text('status').notNull().default('Terjadwal'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    index('case_schedules_case_idx').on(t.caseId),
    index('case_schedules_date_idx').on(t.scheduleDate),
    index('case_schedules_status_idx').on(t.status),
  ],
);

export const caseDocuments = pgTable(
  'case_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    caseId: uuid('case_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    /** Path di bucket `case-documents`. */
    filePath: text('file_path').notNull(),
    fileName: text('file_name'),
    fileSize: bigint('file_size', { mode: 'number' }),
    mimeType: text('mime_type'),
    sharedWithClient: boolean('shared_with_client').notNull().default(false),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    check('case_documents_size_max25mb', sql`${t.fileSize} is null or ${t.fileSize} <= 26214400`),
    index('case_documents_case_idx').on(t.caseId),
  ],
);
