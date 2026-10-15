/**
 * Skema validasi modul auth (Agent C · C1).
 * PRD §5.1: login email+password min 8 karakter, throttle 5 gagal/15 menit.
 */
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

export const setupSchema = z.object({
  email: z.email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupInput = z.infer<typeof setupSchema>;