/**
 * Skema validasi modul advocates (Agent C · C5).
 * PRD §5.3: wajib nama, alamat, telepon, nomor rekening, pendidikan min 1.
 * Satu akun hanya boleh terhubung ke satu data advokat/paralegal.
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

/**
 * Baris advokat/paralegal dibuat otomatis (trigger DB) saat akun dibuat — tidak ada skema create.
 * Kolom kosong diperbolehkan (null = belum diisi, "belum lengkap"); kelengkapan dihitung DB.
 * Nama diubah di sini → ikut mengubah nama akun (trigger).
 */
const optionalText = z
  .string()
  .trim()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : v || null));

export const updateAdvocateSchema = z.object({
  fullName: z.string().trim().min(1, 'Nama lengkap wajib diisi').optional(),
  address: optionalText,
  phone: optionalText,
  bankName: optionalText,
  bankAccount: optionalText,
  licenseNumber: optionalText,
  education: z.array(educationSchema).optional(),
  trainings: z.array(trainingSchema).optional(),
});

export type Education = z.infer<typeof educationSchema>;
export type Training = z.infer<typeof trainingSchema>;
export type UpdateAdvocateInput = z.infer<typeof updateAdvocateSchema>;
