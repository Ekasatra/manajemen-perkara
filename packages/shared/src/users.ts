/**
 * Skema validasi modul users (Agent C · C2).
 * PRD §5.1: email unik (case-insensitive), password min 8,
 * tidak boleh ubah role/nonaktif diri sendiri.
 */
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.email('Email tidak valid'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  role: z.enum(['Admin', 'Advokat', 'Paralegal']),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  isActive: z.boolean().optional().default(true),
  emailApproval: z.boolean().optional().default(true),
  emailReminder: z.boolean().optional().default(true),
  emailDisposisi: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum(['Admin', 'Advokat', 'Paralegal']).optional(),
  isActive: z.boolean().optional(),
  emailApproval: z.boolean().optional(),
  emailReminder: z.boolean().optional(),
  emailDisposisi: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;