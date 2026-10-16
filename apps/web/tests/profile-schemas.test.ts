import { describe, expect, it } from 'vitest';
import { changePasswordSchema, updateProfileSchema } from '@ekasatra/shared';

describe('skema profil sendiri', () => {
  it('menolak perubahan kosong dan nama kosong', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
    expect(updateProfileSchema.safeParse({ fullName: '   ' }).success).toBe(false);
  });
  it('menerima sebagian kolom dan tidak meloloskan role', () => {
    const r = updateProfileSchema.safeParse({ emailReminder: false, role: 'admin' });
    expect(r.success).toBe(true);
    expect(r.success && 'role' in r.data).toBe(false);
  });
  it('password baru minimal 8 karakter', () => {
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: '1234567' }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({ currentPassword: 'x', newPassword: '12345678' }).success,
    ).toBe(true);
  });
});
