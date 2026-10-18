import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { profiles } from './identity';

/**
 * Status "sudah dibaca" per pengguna untuk notifikasi turunan (R8).
 *
 * Notifikasi tidak disimpan sebagai baris tersendiri: daftarnya dihitung dari data
 * surat/jadwal (lihat `packages/core/src/notifications/read.ts`). Yang perlu
 * dipersistenkan hanyalah kunci notifikasi yang sudah dibaca pengguna, sehingga
 * hitungan "belum dibaca" dan daftar memakai filter yang sama.
 *
 * `notification_key` = `PersonalNotificationItem.id` yang stabil
 * (`approval-<suratId>`, `disposisi-<suratMasukId>`, `reject-<suratId>`,
 * `sidang-notif-<jadwalId>`).
 */
export const notificationReads = pgTable(
  'notification_reads',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    notificationKey: text('notification_key').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({
      name: 'notification_reads_user_id_notification_key_pk',
      columns: [t.userId, t.notificationKey],
    }),
    index('notification_reads_user_idx').on(t.userId),
  ],
);
