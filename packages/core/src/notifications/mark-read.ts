/**
 * Tandai notifikasi dibaca (R8).
 *
 * Kunci notifikasi divalidasi terhadap daftar yang benar-benar terlihat oleh
 * pengguna sebelum ditulis, sehingga body tidak bisa dipakai untuk menyisipkan
 * kunci sembarang ke `notification_reads`.
 */
import { notificationReads } from '@ekasatra/db';
import { notFound } from '@ekasatra/shared';
import type { NotificationFeed } from '@ekasatra/shared';
import type { DbExecutor } from '../kernel/db-helpers';
import { getNotificationsForUser, type NotificationPreloaded, type NotificationUser } from './read';

/** Tandai satu notifikasi dibaca; `id` harus ada di daftar pengguna. */
export async function markNotificationRead(
  db: DbExecutor,
  user: NotificationUser,
  id: string,
  preloaded?: NotificationPreloaded,
): Promise<NotificationFeed> {
  const feed = await getNotificationsForUser(db, user, preloaded);
  if (!feed.notifications.some((n) => n.id === id)) {
    throw notFound('Notifikasi tidak ditemukan');
  }

  await db
    .insert(notificationReads)
    .values({ userId: user.userId, notificationKey: id })
    .onConflictDoNothing({ target: [notificationReads.userId, notificationReads.notificationKey] });

  return {
    ...feed,
    notifications: feed.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    unreadCount: feed.unreadCount - (feed.notifications.find((n) => n.id === id)?.read ? 0 : 1),
  };
}

/** Tandai semua notifikasi yang saat ini belum dibaca. */
export async function markAllNotificationsRead(
  db: DbExecutor,
  user: NotificationUser,
  preloaded?: NotificationPreloaded,
): Promise<NotificationFeed> {
  const feed = await getNotificationsForUser(db, user, preloaded);
  const unread = feed.notifications.filter((n) => !n.read);

  if (unread.length > 0) {
    await db
      .insert(notificationReads)
      .values(unread.map((n) => ({ userId: user.userId, notificationKey: n.id })))
      .onConflictDoNothing({
        target: [notificationReads.userId, notificationReads.notificationKey],
      });
  }

  return {
    ...feed,
    notifications: feed.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  };
}
