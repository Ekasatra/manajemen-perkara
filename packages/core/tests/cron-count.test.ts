/* eslint-disable @typescript-eslint/no-explicit-any -- mock Drizzle/transport */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const notifyMock = vi.fn();
vi.mock('../src/notifications/notify', () => ({ notify: (...a: unknown[]) => notifyMock(...a) }));
vi.mock('../src/settings/read', () => ({ getSetting: vi.fn(async (_d, _k, def) => def) }));
vi.mock('../src/audit/read', () => ({
  isCronRemindersAlreadyRunToday: vi.fn(async () => false),
  recordCronRemindersRun: vi.fn(async () => undefined),
}));
vi.mock('../src/cases/read', () => ({
  getHearingRemindersForDate: vi.fn(async () => [
    { caseId: 'c', caseTitle: 'T', scheduleDate: '2026-10-18', memberUserIds: ['u1', 'u2', 'u3', 'u4'] },
  ]),
  getUpayaDeadlineReminders: vi.fn(async () => []),
}));

import { runDailyRemindersCron } from '../src/cron';
import { recordCronRemindersRun } from '../src/audit/read';

describe('cron: hitungan terkirim', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'rahasia-panjang-1234';
    notifyMock.mockReset();
  });

  it('hanya menghitung yang benar-benar terkirim; skip preferensi bukan gagal', async () => {
    notifyMock
      .mockResolvedValueOnce({ sent: true })
      .mockResolvedValueOnce({ sent: false, reason: 'disabled_by_user_preference' })
      .mockResolvedValueOnce({ sent: false, reason: 'Resend API error (500)' })
      .mockResolvedValueOnce({ sent: true });
    const r = await runDailyRemindersCron({} as any, 'rahasia-panjang-1234');
    expect(r).toMatchObject({ status: 'success', hearingRemindersSent: 2, failed: 1 });
    expect(recordCronRemindersRun).toHaveBeenCalledTimes(1);
  });

  it('secret beda panjang/isi ditolak', async () => {
    await expect(runDailyRemindersCron({} as any, 'x')).rejects.toThrow();
    await expect(runDailyRemindersCron({} as any, 'rahasia-panjang-1235')).rejects.toThrow();
  });
});
