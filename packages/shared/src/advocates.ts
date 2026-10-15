/**
 * Skema validasi modul advocates (Agent C · C5).
 * PRD §5.3: wajib nama, alamat, telepon, nomor rekening, pendidikan min 1.
 * Satu akun hanya boleh terhubung ke satu data advokat.
 */
import { z } from 'zod';

export const educationSchema = z.object({
  level: z.string().min(1, 'Jenjang wajib diisi'),
  institution: z.string().min(1, 'Institusi wajib diisi'),
  year: z.string().optional(),
});

export const trainingSchema = z.object({
  name: z.string().min(1, 'Nama pelatihan wajib diisi'),
  organizer: z.string().optional(),
  year: z.string().optional(),
});

export const createAdvocateSchema = z.object({
  userId: z.uuid().nullable().optional(),
  fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
  address: z.string().min(1, 'Alamat wajib diisi'),
  phone: z.string().min(1, 'Telepon wajib diisi'),
  bankName: z.string().nullable().optional(),
  bankAccount: z.string().min(1, 'Nomor rekening wajib diisi'),
  licenseNumber: z.string().nullable().optional(),
  education: z.array(educationSchema).min(1, 'Pendidikan minimal 1'),
  trainings: z.array(trainingSchema).optional().default([]),
});

export const updateAdvocateSchema = z.object({
  userId: z.uuid().nullable().optional(),
  fullName: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  bankName: z.string().nullable().optional(),
  bankAccount: z.string().min(1).optional(),
  licenseNumber: z.string().nullable().optional(),
  education: z.array(educationSchema).min(1).optional(),
  trainings: z.array(trainingSchema).optional(),
});

export type Education = z.infer<typeof educationSchema>;
export type Training = z.infer<typeof trainingSchema>;
export type CreateAdvocateInput = z.infer<typeof createAdvocateSchema>;
export type UpdateAdvocateInput = z.infer<typeof updateAdvocateSchema>;