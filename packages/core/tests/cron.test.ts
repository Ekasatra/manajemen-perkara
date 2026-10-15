/* eslint-disable @typescript-eslint/no-explicit-any -- mock Drizzle/transport */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { runDailyRemindersCron } from '../src/cron';
import { setEmailTransport } from '../src/notifications';

describe('Cron Pengingat Harian (G5 & PRD §5.13)', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'super-secret-cron-token-123';
    setEmailTransport(async () => ({ success: true }));
  });

  it('menolak eksekusi tanpa CRON_SECRET yang valid', async () => {
    const fakeDb = {} as any;
    await expect(runDailyRemindersCron(fakeDb, 'wrong-secret')).rejects.toThrow(
      /CRON_SECRET tidak valid/,
    );
    await expect(runDailyRemindersCron(fakeDb, undefined)).rejects.toThrow(
      /CRON_SECRET tidak valid/,
    );
  });

  it('idempoten per hari: tidak mengirim ulang jika sudah pernah jalan hari ini', async () => {
    // isCronRemindersAlreadyRunToday returns true
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      }),
    } as any;

    const result = await runDailyRemindersCron(fakeDb, 'super-secret-cron-token-123');
    expect(result.status).toBe('already_run_today');
    expect(result.hearingRemindersSent).toBe(0);
    expect(result.upayaRemindersSent).toBe(0);
  });
});

