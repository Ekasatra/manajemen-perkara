import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { timestamps } from './_helpers';
import { profiles } from './identity';

// Token portal: 64 hex acak (2 × uuid v4, CSPRNG) — memenuhi syarat ≥32 karakter, tanpa extension.
const randomToken = sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`;

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** `KL-0001`, dibuat aplikasi lewat next_counter('KL'). */
    clientCode: text('client_code').notNull().unique(),
    name: text('name').notNull(),
    /** Dari daftar `client_types` di settings. */
    type: text('type'),
    /** [{ type, value }] maks 20. */
    contacts: jsonb('contacts')
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Diturunkan dari contacts oleh aplikasi. */
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    notes: text('notes'),
    portalToken: text('portal_token').notNull().unique().default(randomToken),
    portalEnabled: boolean('portal_enabled').notNull().default(true),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    check(
      'clients_contacts_max20',
      sql`jsonb_typeof(${t.contacts}) = 'array' and jsonb_array_length(${t.contacts}) <= 20`,
    ),
    index('clients_name_idx').on(t.name),
    index('clients_created_at_idx').on(t.createdAt),
  ],
);

export const opponents = pgTable(
  'opponents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: text('type'),
    contacts: jsonb('contacts')
      .notNull()
      .default(sql`'[]'::jsonb`),
    address: text('address'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => [
    check(
      'opponents_contacts_max20',
      sql`jsonb_typeof(${t.contacts}) = 'array' and jsonb_array_length(${t.contacts}) <= 20`,
    ),
    index('opponents_name_idx').on(t.name),
  ],
);
