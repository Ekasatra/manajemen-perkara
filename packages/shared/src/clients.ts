/**
 * Skema validasi modul clients (Agent C · C3).
 * PRD §5.2: nama wajib, kode KL- otomatis, kontak maks 20,
 * tipe dari daftar di Pengaturan, portal token acak.
 */
import { z } from 'zod';

export const contactTypeSchema = z.enum([
  'HP',
  'WhatsApp',
  'Telepon',
  'Email',
  'Fax',
  'Lainnya',
]);

export const contactSchema = z.object({
  type: contactTypeSchema,
  value: z.string().min(1, 'Nilai kontak wajib diisi'),
});

export const contactsSchema = z.array(contactSchema).max(20, 'Maksimal 20 kontak');

export const createClientSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  type: z.string().optional(),
  contacts: contactsSchema.optional().default([]),
  address: z.string().optional(),
  notes: z.string().optional(),
  portalEnabled: z.boolean().optional().default(true),
});

export const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().nullable().optional(),
  contacts: contactsSchema.optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  portalEnabled: z.boolean().optional(),
});

export type Contact = z.infer<typeof contactSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;