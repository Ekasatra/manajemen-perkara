/**
 * Skema validasi modul opponents (Agent C · C4).
 * PRD §5.2: kontak daftar {type, value} maks 20, tipe dinamis dari Pengaturan.
 */
import { z } from 'zod';
import { contactsSchema } from './clients';

export { contactSchema, contactsSchema } from './clients';

export const createOpponentSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  type: z.string().optional(),
  contacts: contactsSchema.optional().default([]),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const updateOpponentSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().nullable().optional(),
  contacts: contactsSchema.optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type CreateOpponentInput = z.infer<typeof createOpponentSchema>;
export type UpdateOpponentInput = z.infer<typeof updateOpponentSchema>;