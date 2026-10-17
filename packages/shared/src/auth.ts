/**
 * Skema validasi modul auth (Agent C · C1).
 * PRD §5.1: login email+password min 8 karakter, throttle 5 gagal/15 menit.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

export const setupSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupInput = z.infer<typeof setupSchema>;

/** Profil sendiri: nama dan preferensi email. Role, email, dan status tidak bisa diubah dari sini. */
export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi').max(120),
    emailApproval: z.boolean(),
    emailReminder: z.boolean(),
    emailDisposisi: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Tidak ada perubahan');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
