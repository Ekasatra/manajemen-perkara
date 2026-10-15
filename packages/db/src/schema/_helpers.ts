import { sql, type SQL } from 'drizzle-orm';
import { timestamp, type AnyPgColumn } from 'drizzle-orm/pg-core';

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

/** Untuk unique index case-insensitive: `uniqueIndex('x').on(lower(t.col))`. */
export const lower = (col: AnyPgColumn): SQL => sql`lower(${col})`;
