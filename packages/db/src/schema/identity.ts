import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';
import { lower, timestamps } from './_helpers';
import { userRole } from './enums';

/** 1:1 dengan auth.users. Kredensial ada di Supabase Auth, bukan di sini. */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    fullName: text('full_name').notNull(),
    role: userRole('role').notNull().default('Paralegal'),
    isActive: boolean('is_active').notNull().default(true),
    emailApproval: boolean('email_approval').notNull().default(true),
    emailReminder: boolean('email_reminder').notNull().default(true),
    emailDisposisi: boolean('email_disposisi').notNull().default(true),
    // Throttle login: 5 gagal → locked_until = now() + 15 menit.
    failedLoginCount: integer('failed_login_count').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('profiles_email_lower_uq').on(lower(t.email)),
    index('profiles_role_idx').on(t.role),
  ],
);

export const advocates = pgTable(
  'advocates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Satu akun hanya boleh terhubung ke satu data advokat (unik; NULL boleh banyak).
    userId: uuid('user_id')
      .unique()
      .references(() => profiles.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    address: text('address').notNull(),
    phone: text('phone').notNull(),
    bankName: text('bank_name'),
    bankAccount: text('bank_account').notNull(),
    licenseNumber: text('license_number'),
    /** [{ level, institution, year? }] — minimal 1. */
    education: jsonb('education')
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** [{ name, organizer?, year? }] */
    trainings: jsonb('trainings')
      .notNull()
      .default(sql`'[]'::jsonb`),
    ...timestamps,
  },
  (t) => [
    check(
      'advocates_education_min1',
      sql`jsonb_typeof(${t.education}) = 'array' and jsonb_array_length(${t.education}) >= 1`,
    ),
  ],
);

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Penomoran atomik lewat fungsi SQL `next_counter(key)`. Jangan menulis langsung. */
export const counters = pgTable('counters', {
  key: text('key').primaryKey(),
  value: integer('value').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
    /** Snapshot nama agar log tetap terbaca bila user dihapus / login gagal. */
    userName: text('user_name'),
    action: text('action').notNull(),
    module: text('module').notNull(),
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    description: text('description'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('activity_logs_created_at_idx').on(t.createdAt.desc()),
    index('activity_logs_user_idx').on(t.userId),
    index('activity_logs_module_idx').on(t.module),
    index('activity_logs_entity_idx').on(t.entityType, t.entityId),
  ],
);
