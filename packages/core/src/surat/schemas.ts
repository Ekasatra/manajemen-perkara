/** Skema input modul surat (zod) — aman dipakai di klien (tanpa DB). */
import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const date = z.iso.date();

export const SIFAT_SURAT = ['Biasa', 'Segera', 'Penting', 'Rahasia'] as const;

export const uploadTargetSchema = z.object({
  fileName: text(255),
  size: z.number().int().positive(),
});

export const createSuratKeluarSchema = z
  .object({
    noSurat: text(100),
    tglSurat: date,
    kepada: text(255),
    perihal: text(500),
    jenis: z.enum(['Perkara', 'Instansi']),
    caseId: z.uuid().nullish(),
    /** Reviewer pilihan pembuat; wajib bagi Paralegal pada jenis Instansi. */
    reviewerId: z.uuid().nullish(),
    filePath: text(500),
    fileName: z.string().trim().max(255).nullish(),
    notes: z.string().trim().max(2000).nullish(),
  })
  .refine((v) => v.jenis !== 'Perkara' || !!v.caseId, {
    path: ['caseId'],
    message: 'Surat jenis Perkara wajib terkait perkara',
  });

export const updateSuratKeluarSchema = z
  .object({
    noSurat: text(100),
    tglSurat: date,
    kepada: text(255),
    perihal: text(500),
    reviewerId: z.uuid().nullable(),
    filePath: text(500),
    fileName: z.string().trim().max(255).nullable(),
    notes: z.string().trim().max(2000).nullable(),
  })
  .partial();

export const approvalActionSchema = z.object({
  note: z.string().trim().max(2000).nullish(),
  /** Hanya untuk Sign: berkas bertanda tangan (opsional). */
  signedFilePath: z.string().trim().max(500).nullish(),
  /** Hanya untuk Send: kirim via email dengan lampiran. */
  sendToEmail: z.email().nullish(),
});

export const createSuratMasukSchema = z.object({
  sender: text(255),
  subject: text(500),
  noSurat: z.string().trim().max(100).nullish(),
  tglSurat: date.nullish(),
  tglTerima: date.optional(),
  sifat: z.enum(SIFAT_SURAT).default('Biasa'),
  caseId: z.uuid().nullish(),
  assignedTo: z.uuid().nullish(),
  disposisiNote: z.string().trim().max(2000).nullish(),
  filePath: z.string().trim().max(500).nullish(),
  fileName: z.string().trim().max(255).nullish(),
});

export const updateSuratMasukSchema = createSuratMasukSchema
  .partial()
  .extend({ status: z.enum(['Belum', 'Didisposisi', 'Selesai']).optional() });

export const createTemplateSchema = z.object({
  name: text(255),
  category: text(100),
  description: z.string().trim().max(1000).nullish(),
  filePath: text(500),
  fileName: z.string().trim().max(255).nullish(),
  fileSize: z.number().int().positive().nullish(),
});

export type CreateSuratKeluarInput = z.infer<typeof createSuratKeluarSchema>;
export type UpdateSuratKeluarInput = z.infer<typeof updateSuratKeluarSchema>;
export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;
export type CreateSuratMasukInput = z.infer<typeof createSuratMasukSchema>;
export type UpdateSuratMasukInput = z.infer<typeof updateSuratMasukSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
