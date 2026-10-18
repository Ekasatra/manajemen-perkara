/**
 * Skema validasi modul clients (Agent C · C3).
 * PRD §5.2: nama wajib, kode KL- otomatis, kontak maks 20,
 * tipe dari daftar di Pengaturan, portal token acak.
 * PRD §4 R3: kontak majemuk dengan kind phone/email, validasi format,
 * maks 10 per jenis, tidak ada duplikat, tepat satu primary per jenis.
 */
import { z } from 'zod';

export const contactKindSchema = z.enum(['phone', 'email']);

export const contactSchema = z.object({
  kind: contactKindSchema,
  label: z.string().optional(),
  value: z.string().min(1, 'Nilai kontak wajib diisi'),
  isPrimary: z.boolean().optional().default(false),
  position: z.number().int().min(0).optional().default(0),
})
  /** Email harus sesuai format RFC dasar. */
  .refine(
    (data) => data.kind !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.value),
    { message: 'Format email tidak valid', path: ['value'] },
  )
  /** Telepon harus sesuai pola PRD §4 R3. */
  .refine(
    (data) => data.kind !== 'phone' || /^[0-9+\-\s()]{6,20}$/.test(data.value),
    { message: 'Format telepon tidak valid', path: ['value'] },
  );

export const contactsSchema = z.array(contactSchema)
  .max(20, 'Maksimal 20 kontak')
  .superRefine((contacts, ctx) => {
    // Maksimal 10 kontak per jenis.
    const counts: Record<string, number> = {};
    for (const c of contacts) {
      counts[c.kind] = (counts[c.kind] ?? 0) + 1;
    }
    if ((counts.phone ?? 0) > 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Maksimal 10 kontak telepon', path: [] });
    }
    if ((counts.email ?? 0) > 10) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Maksimal 10 kontak email', path: [] });
    }

    // Duplikat (kind + value) ditolak.
    const seen = new Set<string>();
    for (const c of contacts) {
      const key = `${c.kind}:${c.value}`;
      if (seen.has(key)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Kontak duplikat', path: [] });
        break;
      }
      seen.add(key);
    }

    // Tepat satu primary per jenis (hanya jika ada kontak jenis tersebut).
    for (const kind of ['phone', 'email'] as const) {
      const kindContacts = contacts.filter((c) => c.kind === kind);
      const primaryCount = kindContacts.filter((c) => c.isPrimary === true).length;
      if (kindContacts.length > 0 && primaryCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Tepat satu kontak ${kind} harus ditandai sebagai utama`,
          path: [],
        });
      }
      if (primaryCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Hanya satu kontak ${kind} boleh menjadi utama`,
          path: [],
        });
      }
    }
  });

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