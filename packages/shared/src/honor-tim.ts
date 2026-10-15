/**
 * Skema validasi modul honor-tim (Agent F · F4–F5). PRD §5.9.
 * `draft` dan `published` terpisah: anggota non-Admin hanya pernah menerima nilai published.
 */
import { z } from 'zod';

export const HONOR_STATES = ['Draft', 'Berubah', 'Terdistribusi'] as const;
export type HonorState = (typeof HONOR_STATES)[number];

const rupiah = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

/** Simpan draft: daftar nilai per anggota. 0 boleh; negatif/pecahan ditolak. */
export const saveHonorDraftSchema = z.object({
  items: z
    .array(z.object({ userId: z.uuid(), amount: rupiah }))
    .min(1)
    .max(100),
});
export type SaveHonorDraftInput = z.infer<typeof saveHonorDraftSchema>;
