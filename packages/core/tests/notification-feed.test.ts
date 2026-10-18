/* eslint-disable @typescript-eslint/no-explicit-any -- stub Drizzle minimal */
import { describe, expect, it } from 'vitest';
import { buildSidangNotifications } from '../src/notifications/read';
import { markAllNotificationsRead, markNotificationRead } from '../src/notifications/mark-read';

/**
 * R8 — hitungan "belum dibaca" harus berasal dari daftar yang sama dengan yang
 * ditampilkan, dan status baca disimpan per kunci notifikasi.
 */

const TODAY = '2026-10-18';

function schedule(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sch-1',
    caseId: 'case-1',
    caseTitle: 'Sengketa Tanah',
    scheduleDate: '2026-10-20',
    scheduleTime: '09:00',
    kind: 'Sidang',
    location: 'PN Jakarta',
    status: 'Terjadwal',
    ...over,
  } as any;
}

describe('buildSidangNotifications', () => {
  it('memakai aturan yang sama dengan dashboard: hanya ≤ 3 hari lagi', () => {
    const items = buildSidangNotifications(
      [
        schedule({ id: 'h1', scheduleDate: '2026-10-19' }), // H+1
        schedule({ id: 'h3', scheduleDate: '2026-10-21' }), // H+3
        schedule({ id: 'h4', scheduleDate: '2026-10-22' }), // H+4 → tidak masuk
      ],
      TODAY,
    );

    expect(items.map((i) => i.id)).toEqual(['sidang-notif-h1', 'sidang-notif-h3']);
  });

  it('membawa tautan dan urgensi yang dipakai panel', () => {
    const [item] = buildSidangNotifications([schedule()], TODAY);

    expect(item).toMatchObject({
      id: 'sidang-notif-sch-1',
      type: 'sidang',
      link: '/cases/case-1',
      urgency: 'medium',
    });
    expect(item!.description).toContain('Sidang');
    expect(item!.description).toContain('PN Jakarta');
  });
});

/**
 * Stub DB: `notification_reads` mengembalikan kunci yang sudah dibaca, insert
 * mencatat nilai. Cukup untuk menguji invarian hitungan.
 */
function stubDb(readKeys: string[], inserted: string[] = []) {
  return {
    select: () => ({
      from: () => ({
        where: async () => readKeys.map((key) => ({ key })),
      }),
    }),
    insert: () => ({
      values: (rows: { notificationKey: string } | { notificationKey: string }[]) => {
        const list = Array.isArray(rows) ? rows : [rows];
        inserted.push(...list.map((r) => r.notificationKey));
        return { onConflictDoNothing: async () => undefined };
      },
    }),
  } as any;
}

const user = { userId: 'u1', role: 'advokat' };

/** Notifikasi surat di-stub lewat preloaded agar tes tidak menyentuh query surat. */
const suratNotifications = [
  { id: 'approval-1', type: 'approval', title: 'A', description: 'a', date: '2026-10-17', link: '/x', urgency: 'high' },
  { id: 'disposisi-1', type: 'disposisi', title: 'B', description: 'b', date: '2026-10-16', link: '/y', urgency: 'medium' },
] as any;

/** Semua data turunan di-preload: tes hanya menguji status baca & hitungan. */
const preloaded = {
  approval: { count: 1, items: [] },
  suratNotifications,
  sidang7Hari: [],
} as any;

describe('markNotificationRead', () => {
  it('menurunkan hitungan sebesar satu dan menandai item yang sama', async () => {
    const inserted: string[] = [];
    const db = stubDb([], inserted);

    const feed = await markNotificationRead(db, user, 'approval-1', preloaded);

    expect(inserted).toEqual(['approval-1']);
    expect(feed.unreadCount).toBe(1);
    expect(feed.notifications.find((n) => n.id === 'approval-1')?.read).toBe(true);
  });

  it('idempoten: menandai ulang tidak menurunkan hitungan lagi', async () => {
    const db = stubDb(['approval-1'], []);
    const feed = await markNotificationRead(db, user, 'approval-1', preloaded);

    expect(feed.unreadCount).toBe(1);
  });

  it('menolak kunci yang bukan milik pengguna', async () => {
    const db = stubDb([], []);
    await expect(
      markNotificationRead(db, user, 'tidak-ada', preloaded),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('markAllNotificationsRead', () => {
  it('menandai semua yang belum dibaca dan menyisakan 0', async () => {
    const inserted: string[] = [];
    const db = stubDb([], inserted);

    const feed = await markAllNotificationsRead(db, user, preloaded);

    expect(inserted.sort()).toEqual(['approval-1', 'disposisi-1']);
    expect(feed.unreadCount).toBe(0);
    expect(feed.notifications.every((n) => n.read)).toBe(true);
  });
});
