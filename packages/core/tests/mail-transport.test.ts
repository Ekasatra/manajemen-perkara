import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above imports — define mocks via vi.hoisted so they exist at hoist time.
const { sendMailMock, createTransportMock } = vi.hoisted(() => {
  const sendMailMock = vi.fn();
  const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));
  return { sendMailMock, createTransportMock };
});

vi.mock('nodemailer', () => ({
  default: { createTransport: createTransportMock },
}));

import { isSmtpConfigured, sendViaSmtp } from '../src/mail/transport';

const ORIG_ENV = { ...process.env };

describe('isSmtpConfigured (W4 R2)', () => {
  beforeEach(() => {
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it('false bila env tidak diset', () => {
    expect(isSmtpConfigured()).toBe(false);
  });

  it('true bila SMTP_USER dan SMTP_PASS diset', () => {
    process.env.SMTP_USER = 'info@ekasatra.com';
    process.env.SMTP_PASS = 'app-password';
    expect(isSmtpConfigured()).toBe(true);
  });

  it('false bila hanya satu env yang diset', () => {
    process.env.SMTP_USER = 'info@ekasatra.com';
    expect(isSmtpConfigured()).toBe(false);
  });
});

describe('sendViaSmtp (W4 R2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  it('return null bila env tidak diset (no-op, tidak transport)', async () => {
    const result = await sendViaSmtp({ to: 'a@x.id', subject: 'Test', html: '<p>Hi</p>' });
    expect(result).toBeNull();
    expect(createTransportMock).not.toHaveBeenCalled();
  });

  it('kirim email via nodemailer bila env diset', async () => {
    process.env.SMTP_USER = 'info@ekasatra.com';
    process.env.SMTP_PASS = 'app-password';
    sendMailMock.mockResolvedValue({ messageId: '<test@example.com>' });

    const result = await sendViaSmtp({ to: 'user@x.id', subject: 'Reset', html: '<p>Link</p>' });
    expect(result).toEqual({ success: true, messageId: '<test@example.com>' });
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'mail.ekasatra.com',
        port: 465,
        secure: true,
        auth: { user: 'info@ekasatra.com', pass: 'app-password' },
      }),
    );
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@x.id', subject: 'Reset' }),
    );
  });

  it('gunakan SMTP_HOST/SMTP_PORT custom bila diset', async () => {
    process.env.SMTP_USER = 'info@ekasatra.com';
    process.env.SMTP_PASS = 'app-password';
    process.env.SMTP_HOST = 'mail.example.com';
    process.env.SMTP_PORT = '587';
    sendMailMock.mockResolvedValue({ messageId: 'ok' });

    await sendViaSmtp({ to: 'u@x.id', subject: 'T', html: '<p/>' });
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'mail.example.com', port: 587, secure: false }),
    );
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
  });

  it('return error bila sendMail melempar', async () => {
    process.env.SMTP_USER = 'info@ekasatra.com';
    process.env.SMTP_PASS = 'app-password';
    sendMailMock.mockRejectedValue(new Error('Connection refused'));

    const result = await sendViaSmtp({ to: 'user@x.id', subject: 'Test', html: '<p>Hi</p>' });
    expect(result).toEqual({ success: false, error: 'Connection refused' });
  });
});

// Pulihkan env setelah suite
afterAll(() => {
  process.env = { ...ORIG_ENV };
});
