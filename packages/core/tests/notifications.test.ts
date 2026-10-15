/* eslint-disable @typescript-eslint/no-explicit-any -- mock Drizzle/transport */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  notify,
  setEmailTransport,
  renderEmailTemplate,
} from '../src/notifications';
import type { SendEmailPayload, SendEmailResult } from '../src/notifications';
import type { NotificationEvent } from '@ekasatra/shared';

describe('notify() - G4 Layanan Notifikasi', () => {
  let sentEmails: SendEmailPayload[] = [];

  beforeEach(() => {
    sentEmails = [];
    setEmailTransport(async (payload: SendEmailPayload): Promise<SendEmailResult> => {
      sentEmails.push(payload);
      return { success: true, messageId: `msg-${Date.now()}` };
    });
  });

  it('menolak pengiriman jika setting notif_email_enabled dinonaktifkan', async () => {
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ value: false }]),
          }),
        }),
      }),
    } as any;

    const event: NotificationEvent = {
      type: 'surat_submit',
      recipientUserId: '11111111-1111-1111-1111-111111111111',
      data: {
        suratId: '22222222-2222-2222-2222-222222222222',
        subject: 'Somasi',
        submitterName: 'Budi Advokat',
      },
    };

    const result = await notify(fakeDb, event);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('disabled_by_settings');
    expect(sentEmails.length).toBe(0);
  });

  it('menolak pengiriman jika user penerima tidak ditemukan', async () => {
    let callCount = 0;
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return { limit: vi.fn().mockResolvedValue([{ value: true }]) };
            }
            return { limit: vi.fn().mockResolvedValue([]) };
          }),
        }),
      }),
    } as any;

    const event: NotificationEvent = {
      type: 'surat_submit',
      recipientUserId: '00000000-0000-0000-0000-000000000000',
      data: {
        suratId: '22222222-2222-2222-2222-222222222222',
        subject: 'Somasi',
        submitterName: 'Budi Advokat',
      },
    };

    const result = await notify(fakeDb, event);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('recipient_not_found');
    expect(sentEmails.length).toBe(0);
  });

  it('menolak pengiriman jika user penerima nonaktif (isActive = false)', async () => {
    let callCount = 0;
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return { limit: vi.fn().mockResolvedValue([{ value: true }]) };
            }
            return {
              limit: vi.fn().mockResolvedValue([
                {
                  id: '11111111-1111-1111-1111-111111111111',
                  email: 'inactive@ekasatra.id',
                  fullName: 'User Nonaktif',
                  isActive: false,
                  emailApproval: true,
                  emailReminder: true,
                  emailDisposisi: true,
                },
              ]),
            };
          }),
        }),
      }),
    } as any;

    const event: NotificationEvent = {
      type: 'surat_submit',
      recipientUserId: '11111111-1111-1111-1111-111111111111',
      data: {
        suratId: '22222222-2222-2222-2222-222222222222',
        subject: 'Somasi',
        submitterName: 'Budi Advokat',
      },
    };

    const result = await notify(fakeDb, event);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('user_inactive');
    expect(result.recipientEmail).toBe('inactive@ekasatra.id');
    expect(sentEmails.length).toBe(0);
  });

  it('menghormati preferensi user: emailApproval = false membatalkan surat_submit', async () => {
    let callCount = 0;
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return { limit: vi.fn().mockResolvedValue([{ value: true }]) };
            }
            return {
              limit: vi.fn().mockResolvedValue([
                {
                  id: '11111111-1111-1111-1111-111111111111',
                  email: 'advokat@ekasatra.id',
                  fullName: 'Advokat Senior',
                  isActive: true,
                  emailApproval: false,
                  emailReminder: true,
                  emailDisposisi: true,
                },
              ]),
            };
          }),
        }),
      }),
    } as any;

    const event: NotificationEvent = {
      type: 'surat_submit',
      recipientUserId: '11111111-1111-1111-1111-111111111111',
      data: {
        suratId: '22222222-2222-2222-2222-222222222222',
        subject: 'Somasi',
        submitterName: 'Budi Advokat',
      },
    };

    const result = await notify(fakeDb, event);
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('disabled_by_user_preference');
    expect(sentEmails.length).toBe(0);
  });

  it('berhasil mengirim email surat_disposisi jika preferensi emailDisposisi = true', async () => {
    let callCount = 0;
    const fakeDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              return { limit: vi.fn().mockResolvedValue([{ value: true }]) };
            }
            if (callCount === 2) {
              return {
                limit: vi.fn().mockResolvedValue([
                  {
                    id: '11111111-1111-1111-1111-111111111111',
                    email: 'paralegal@ekasatra.id',
                    fullName: 'Paralegal Muda',
                    isActive: true,
                    emailApproval: true,
                    emailReminder: true,
                    emailDisposisi: true,
                  },
                ]),
              };
            }
            return { limit: vi.fn().mockResolvedValue([{ value: 'EKASATRA Test Office' }]) };
          }),
        }),
      }),
    } as any;

    const event: NotificationEvent = {
      type: 'surat_disposisi',
      recipientUserId: '11111111-1111-1111-1111-111111111111',
      data: {
        suratMasukId: '33333333-3333-3333-3333-333333333333',
        noAgenda: 'SM/2026/0001',
        sender: 'Pengadilan Negeri Jakarta',
        subject: 'Panggilan Sidang',
        note: 'Tolong siapkan berkas kuasa.',
      },
    };

    const result = await notify(fakeDb, event);
    expect(result.sent).toBe(true);
    expect(result.recipientEmail).toBe('paralegal@ekasatra.id');
    expect(sentEmails.length).toBe(1);
    const sent = sentEmails[0]!;
    expect(sent.to).toBe('paralegal@ekasatra.id');
    expect(sent.subject).toContain('SM/2026/0001');
    expect(sent.html).toContain('Paralegal Muda');
    expect(sent.html).toContain('Tolong siapkan berkas kuasa.');
    expect(sent.html).toContain('EKASATRA Test Office');
  });

  it('berhasil merender seluruh template email secara konsisten', () => {
    const events: NotificationEvent[] = [
      {
        type: 'surat_submit',
        recipientUserId: 'u1',
        data: { suratId: 's1', subject: 'Surat Gugatan', submitterName: 'Advokat A' },
      },
      {
        type: 'surat_sign',
        recipientUserId: 'u1',
        data: { suratId: 's2', subject: 'Kuasa Hukum', reviewerName: 'Reviewer B' },
      },
      {
        type: 'surat_approved',
        recipientUserId: 'u1',
        data: { suratId: 's3', subject: 'Surat Jawaban' },
      },
      {
        type: 'surat_reject',
        recipientUserId: 'u1',
        data: { suratId: 's4', subject: 'Eksepsi', rejecterName: 'Partner C', reason: 'Format salah' },
      },
      {
        type: 'honor_publish',
        recipientUserId: 'u1',
        data: { caseId: 'c1', caseTitle: 'Sengketa Tanah', amount: 5000000 },
      },
      {
        type: 'reminder_sidang',
        recipientUserId: 'u1',
        data: { caseId: 'c2', caseTitle: 'Perkara Arbitrase', scheduleDate: '2026-10-20', daysLeft: 3 },
      },
      {
        type: 'reminder_upaya',
        recipientUserId: 'u1',
        data: { caseId: 'c3', caseTitle: 'Perkara Wanprestasi', deadlineDate: '2026-10-22', daysLeft: 5 },
      },
    ];

    for (const ev of events) {
      const rendered = renderEmailTemplate(ev, 'Budi Advokat', 'EKASATRA Law Firm');
      expect(rendered.subject).toBeTruthy();
      expect(rendered.html).toContain('Budi Advokat');
      expect(rendered.html).toContain('EKASATRA Law Firm');
    }
  });
});

