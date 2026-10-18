/**
 * Satu sumber kebenaran notifikasi personal (R8).
 *
 * Daftar notifikasi TIDAK disimpan sebagai baris tersendiri: ia diturunkan dari
 * data surat & jadwal. Karena itu "belum dibaca" tidak bisa dihitung dari tabel
 * notifikasi; status baca disimpan per kunci di `notification_reads`.
 *
 * Aturan yang dijaga di sini:
 * - `unreadCount` = jumlah item dengan `read === false` pada daftar yang SAMA
 *   yang ditampilkan panel, kartu dashboard, dan halaman "Lihat semua".
 * - Notifikasi sidang ikut dihitung (dulu hanya dashboard yang menambahkannya,
 *   sehingga badge lonceng dan kartu dashboard berbeda).
 */
import { eq } from 'drizzle-orm';
import { notificationReads } from '@ekasatra/db';
import type {
  DashboardScheduleItem,
  NotificationFeed,
  NotificationItem,
  PersonalNotificationItem,
} from '@ekasatra/shared';
import type { DbExecutor } from '../kernel/db-helpers';
import { getApprovalMenungguSaya, getSuratPersonalNotifications } from '../surat/read';
import { getUpcomingSchedulesForDashboard } from '../cases/read';

/** Jendela pengambilan jadwal (sama dengan dashboard) dan ambang notifikasi sidang. */
const SCHEDULE_WINDOW_DAYS = 7;
const SIDANG_NOTIFY_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface NotificationUser {
  userId: string;
  role: string;
}

export interface NotificationPreloaded {
  /** Hasil `getApprovalMenungguSaya` yang sudah dihitung pemanggil. */
  approval?: Awaited<ReturnType<typeof getApprovalMenungguSaya>>;
  /** Hasil `getSuratPersonalNotifications` yang sudah dihitung pemanggil. */
  suratNotifications?: PersonalNotificationItem[];
  /** Hasil `getUpcomingSchedulesForDashboard` yang sudah dihitung pemanggil. */
  sidang7Hari?: DashboardScheduleItem[];
}

function dayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Notifikasi sidang yang layak tampil: jadwal dalam 7 hari ke depan, dan hanya
 * yang tersisa ≤ 3 hari — aturan yang sama dengan yang dipakai dashboard.
 */
export function buildSidangNotifications(
  schedules: DashboardScheduleItem[],
  todayStr: string,
): PersonalNotificationItem[] {
  const todayMs = new Date(todayStr).getTime();
  const items: PersonalNotificationItem[] = [];

  for (const s of schedules) {
    if (!s.scheduleDate) continue;
    const daysLeft = Math.ceil((new Date(s.scheduleDate).getTime() - todayMs) / DAY_MS);
    if (daysLeft > SIDANG_NOTIFY_DAYS) continue;

    items.push({
      id: `sidang-notif-${s.id}`,
      type: 'sidang',
      title: `Sidang Mendatang: ${s.caseTitle}`,
      description: `${s.kind} pada ${s.scheduleDate}${s.scheduleTime ? ` ${s.scheduleTime} WIB` : ''}${s.location ? ` di ${s.location}` : ''}`,
      date: s.scheduleDate,
      link: `/cases/${s.caseId}`,
      urgency: daysLeft <= 1 ? 'high' : 'medium',
    });
  }

  return items;
}

/** Terbaru dulu; tanggal tak valid ditaruh paling akhir agar urutan stabil. */
function sortNewestFirst<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const at = new Date(a.date).getTime();
    const bt = new Date(b.date).getTime();
    if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
    if (Number.isNaN(at)) return 1;
    if (Number.isNaN(bt)) return -1;
    return bt - at;
  });
}

/**
 * Daftar notifikasi personal + hitungan belum dibaca.
 *
 * Pemanggil yang sudah punya data (dashboard) boleh mengirim `preloaded` supaya
 * tidak ada query yang diulang; pemanggil lain (endpoint lonceng) cukup
 * memanggil tanpa argumen ketiga.
 */
export async function getNotificationsForUser(
  db: DbExecutor,
  user: NotificationUser,
  preloaded: NotificationPreloaded = {},
): Promise<NotificationFeed> {
  const now = new Date();
  const todayStr = dayString(now);
  const inWindowStr = dayString(new Date(now.getTime() + SCHEDULE_WINDOW_DAYS * DAY_MS));

  const approval =
    preloaded.approval ?? (await getApprovalMenungguSaya(db, user.userId));

  const suratNotifications =
    preloaded.suratNotifications ??
    (await getSuratPersonalNotifications(db, user.userId, approval));

  const sidang7Hari =
    preloaded.sidang7Hari ??
    (await getUpcomingSchedulesForDashboard(db, todayStr, inWindowStr, {
      userId: user.userId,
      role: user.role,
    }));

  const base: PersonalNotificationItem[] = [
    ...suratNotifications,
    ...buildSidangNotifications(sidang7Hari, todayStr),
  ];

  // Satu query kecil untuk status baca; kunci yang tidak ada = belum dibaca.
  const readRows = await db
    .select({ key: notificationReads.notificationKey })
    .from(notificationReads)
    .where(eq(notificationReads.userId, user.userId));
  const readKeys = new Set(readRows.map((r) => r.key));

  const notifications: NotificationItem[] = sortNewestFirst(base).map((item) => ({
    ...item,
    read: readKeys.has(item.id),
  }));

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    approvalCount: approval.count,
  };
}
