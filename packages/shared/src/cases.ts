/**
 * Skema validasi modul cases (Agent D · D1–D7).
 * PRD §5.4: nomor REG/{tahun}/ otomatis, status Aktif→Putus→Banding→Kasasi→PK→Selesai,
 * perubahan status otomatis set tanggal putus / upaya_deadline + entri timeline.
 * Tim: banyak advokat, banyak paralegal, satu manager — hanya Admin mengatur.
 */
import { z } from 'zod';

// Enum DB berkapital — dipakai agar zod & query konsisten dengan skema (Agent B).
export const CASE_STATUS = [
  'Aktif',
  'Putus',
  'Banding',
  'Kasasi',
  'PK',
  'Selesai',
] as const;
export type CaseStatus = (typeof CASE_STATUS)[number];

export const CASE_MEMBER_ROLE = ['Advokat', 'Paralegal', 'Manager'] as const;
export type CaseMemberRole = (typeof CASE_MEMBER_ROLE)[number];

export const TIMELINE_EVENT_TYPE = [
  'Status',
  'Putusan',
  'Banding',
  'Kasasi',
  'PK',
  'Catatan',
  'Dokumen',
  'Surat',
  'Lainnya',
] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPE)[number];

/** Maksimum ukuran unggahan dokumen perkara (PRD §5.4: 25 MB). */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024; // 26_214_400

// --- D1: CRUD Perkara ---

export const createCaseSchema = z.object({
  title: z.string().min(1, 'Judul perkara wajib diisi'),
  clientId: z.uuid('ID klien tidak valid'),
  opponentId: z.uuid().nullable().optional(),
  caseNumber: z.string().optional(),
  court: z.string().optional(),
  caseType: z.string().optional(),
  description: z.string().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal mulai harus YYYY-MM-DD')
    .optional(),
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const updateCaseSchema = z.object({
  title: z.string().min(1).optional(),
  clientId: z.uuid().optional(),
  opponentId: z.uuid().nullable().optional(),
  caseNumber: z.string().nullable().optional(),
  court: z.string().nullable().optional(),
  caseType: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});
export type UpdateCaseInput = z.infer<typeof updateCaseSchema>;

// --- D3: Perubahan status ---

export const changeCaseStatusSchema = z.object({
  status: z.enum(CASE_STATUS),
});
export type ChangeCaseStatusInput = z.infer<typeof changeCaseStatusSchema>;

// --- D2: Tim perkara ---

export const createCaseMemberSchema = z.object({
  userId: z.uuid('ID user tidak valid'),
  peran: z.enum(CASE_MEMBER_ROLE),
});
export type CreateCaseMemberInput = z.infer<typeof createCaseMemberSchema>;

// --- D4: Timeline ---

export const createTimelineSchema = z.object({
  eventType: z.enum(TIMELINE_EVENT_TYPE).optional().default('Catatan'),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal peristiwa harus YYYY-MM-DD')
    .optional(),
  title: z.string().min(1, 'Judul peristiwa wajib diisi'),
  description: z.string().optional(),
});
export type CreateTimelineInput = z.infer<typeof createTimelineSchema>;

// --- D4: Jadwal ---

export const createScheduleSchema = z.object({
  scheduleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal jadwal harus YYYY-MM-DD'),
  scheduleTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Jam harus HH:MM')
    .optional(),
  kind: z.string().min(1).optional().default('Sidang'),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional().default('Terjadwal'),
});
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;

export const updateScheduleSchema = z.object({
  scheduleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  scheduleTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  kind: z.string().optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.string().optional(),
});
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

// --- D4: Dokumen ---

export const updateDocumentSchema = z.object({
  title: z.string().min(1).optional(),
  sharedWithClient: z.boolean().optional(),
});
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// --- D7: Kontrak baca untuk modul lain (E, F, G) ---

/** Info perkara yang aman dibagikan ke modul lain setelah cakupan visibilitas lolos. */
export interface CaseForUser {
  id: string;
  regNo: string;
  title: string;
  clientId: string;
  status: CaseStatus;
  court: string | null;
  caseNumber: string | null;
}

/** Anggota tim perkara, urut createdAt paling awal (dasar reviewer/signer surat Perkara — REQ-E2). */
export interface CaseTeamMember {
  userId: string;
  peran: CaseMemberRole;
  fullName: string;
  createdAt: string;
}
