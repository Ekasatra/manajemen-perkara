/* eslint-disable @typescript-eslint/no-explicit-any -- mock Drizzle/Supabase */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const generateLinkMock = vi.fn();

vi.mock('@ekasatra/db', () => ({
  profiles: { id: 'id', email: 'email', fullName: 'full_name', isActive: 'is_active', role: 'role' },
  createSupabaseServiceClient: () => ({
    auth: { admin: { generateLink: generateLinkMock } },
  }),
}));

vi.mock('../src/settings/read', () => ({
  getSetting: vi.fn(async () => 'EKASATRA Test Office'),
}));

vi.mock('../src/notifications/resend', () => ({
  sendEmailViaResend: vi.fn(async () => ({ success: true, messageId: 'msg-test' })),
}));

import { sendResetLink, maskEmail } from '../src/users/reset-link';
import { sendEmailViaResend } from '../src/notifications/resend';

function mockDb(row: any | null): any {
  const limit = vi.fn(async () => (row ? [row] : []));
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { select: vi.fn(() => ({ from })) };
}

describe('maskEmail (W4 R1)', () => {
  it('sembunyikan bagian tengah email', () => {
    expect(maskEmail('andi@ekasatra.com')).toBe('an***@ekasatra.com');
  });
  it('email tanpa @ → ***', () => {
    expect(maskEmail('invalid')).toBe('***');
  });
  it('email dengan @ di awal → ***', () => {
    expect(maskEmail('@domain.com')).toBe('***');
  });
});

describe('sendResetLink (W4 R1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateLinkMock.mockReset();
  });

  it('gagal bila user tidak ditemukan', async () => {
    const db = mockDb(null);
    const result = await sendResetLink(db, 'nonexistent-id');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('tidak ditemukan');
  });

  it('gagal bila user tidak punya email', async () => {
    const db = mockDb({ id: 'u1', email: null, fullName: 'Test', isActive: true });
    const result = await sendResetLink(db, 'u1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('email');
  });

  it('gagal bila akun tidak aktif', async () => {
    const db = mockDb({ id: 'u1', email: 'a@x.id', fullName: 'Test', isActive: false });
    const result = await sendResetLink(db, 'u1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('tidak aktif');
  });

  it('gagal bila Supabase generateLink error', async () => {
    const db = mockDb({ id: 'u1', email: 'a@x.id', fullName: 'Test', isActive: true });
    generateLinkMock.mockResolvedValue({ data: null, error: { message: 'rate limit exceeded' } });
    const result = await sendResetLink(db, 'u1');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('rate limit');
  });

  it('berhasil kirim link reset, email tersamar di hasil, link asli tidak bocor', async () => {
    const db = mockDb({ id: 'u1', email: 'andi@ekasatra.com', fullName: 'Andi', isActive: true });
    generateLinkMock.mockResolvedValue({
      data: {
        properties: { action_link: 'https://app.ekasatra.com/set-password?code=SECRET_TOKEN' },
        user: {},
      },
      error: null,
    });
    const result = await sendResetLink(db, 'u1');
    expect(result.ok).toBe(true);
    expect(result.maskedEmail).toBe('an***@ekasatra.com');
    expect(sendEmailViaResend).toHaveBeenCalledTimes(1);
    // Link asli / token tidak pernah dikembalikan ke pemanggil
    expect(JSON.stringify(result)).not.toContain('SECRET_TOKEN');
    expect(JSON.stringify(result)).not.toContain('code=');
  });

  it('ok=false bila pengiriman email gagal', async () => {
    const db = mockDb({ id: 'u1', email: 'andi@ekasatra.com', fullName: 'Andi', isActive: true });
    generateLinkMock.mockResolvedValue({
      data: {
        properties: { action_link: 'https://app.ekasatra.com/set-password?code=SECRET_TOKEN' },
        user: {},
      },
      error: null,
    });
    vi.mocked(sendEmailViaResend).mockResolvedValueOnce({ success: false, error: 'SMTP down' });
    const result = await sendResetLink(db, 'u1');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('SMTP down');
  });
});
