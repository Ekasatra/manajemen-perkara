import { z } from 'zod';

export const NOTIFICATION_TYPES = [
  'surat_submit',
  'surat_sign',
  'surat_approved',
  'surat_reject',
  'surat_disposisi',
  'honor_publish',
  'reminder_sidang',
  'reminder_upaya',
  'custom',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface SuratSubmitData {
  suratId: string;
  noSurat?: string;
  subject: string;
  submitterName: string;
}

export interface SuratSignData {
  suratId: string;
  noSurat?: string;
  subject: string;
  reviewerName?: string;
}

export interface SuratApprovedData {
  suratId: string;
  noSurat?: string;
  subject: string;
  signerName?: string;
}

export interface SuratRejectData {
  suratId: string;
  noSurat?: string;
  subject: string;
  rejecterName: string;
  reason: string;
}

export interface SuratDisposisiData {
  suratMasukId: string;
  noAgenda: string;
  sender: string;
  subject: string;
  note?: string;
}

export interface HonorPublishData {
  caseId: string;
  caseTitle: string;
  amount: number;
}

export interface ReminderSidangData {
  caseId: string;
  caseTitle: string;
  scheduleDate: string;
  scheduleTime?: string | null;
  location?: string | null;
  daysLeft: number;
}

export interface ReminderUpayaData {
  caseId: string;
  caseTitle: string;
  deadlineDate: string;
  daysLeft: number;
}

export interface CustomNotificationData {
  subject: string;
  body: string;
  actionUrl?: string;
  actionText?: string;
}

export type NotificationEvent =
  | { type: 'surat_submit'; recipientUserId: string; data: SuratSubmitData }
  | { type: 'surat_sign'; recipientUserId: string; data: SuratSignData }
  | { type: 'surat_approved'; recipientUserId: string; data: SuratApprovedData }
  | { type: 'surat_reject'; recipientUserId: string; data: SuratRejectData }
  | { type: 'surat_disposisi'; recipientUserId: string; data: SuratDisposisiData }
  | { type: 'honor_publish'; recipientUserId: string; data: HonorPublishData }
  | { type: 'reminder_sidang'; recipientUserId: string; data: ReminderSidangData }
  | { type: 'reminder_upaya'; recipientUserId: string; data: ReminderUpayaData }
  | { type: 'custom'; recipientUserId: string; data: CustomNotificationData };

export interface NotifyResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
  recipientEmail?: string;
}

export const notificationEventSchema = z.discriminatedUnion('type', [  z.object({
    type: z.literal('surat_submit'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      suratId: z.string().uuid(),
      noSurat: z.string().optional(),
      subject: z.string(),
      submitterName: z.string(),
    }),
  }),
  z.object({
    type: z.literal('surat_sign'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      suratId: z.string().uuid(),
      noSurat: z.string().optional(),
      subject: z.string(),
      reviewerName: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('surat_approved'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      suratId: z.string().uuid(),
      noSurat: z.string().optional(),
      subject: z.string(),
      signerName: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('surat_reject'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      suratId: z.string().uuid(),
      noSurat: z.string().optional(),
      subject: z.string(),
      rejecterName: z.string(),
      reason: z.string(),
    }),
  }),
  z.object({
    type: z.literal('surat_disposisi'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      suratMasukId: z.string().uuid(),
      noAgenda: z.string(),
      sender: z.string(),
      subject: z.string(),
      note: z.string().optional(),
    }),
  }),
  z.object({
    type: z.literal('honor_publish'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      caseId: z.string().uuid(),
      caseTitle: z.string(),
      amount: z.number().int().nonnegative(),
    }),
  }),
  z.object({
    type: z.literal('reminder_sidang'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      caseId: z.string().uuid(),
      caseTitle: z.string(),
      scheduleDate: z.string(),
      scheduleTime: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
      daysLeft: z.number().int(),
    }),
  }),
  z.object({
    type: z.literal('reminder_upaya'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      caseId: z.string().uuid(),
      caseTitle: z.string(),
      deadlineDate: z.string(),
      daysLeft: z.number().int(),
    }),
  }),
  z.object({
    type: z.literal('custom'),
    recipientUserId: z.string().uuid(),
    data: z.object({
      subject: z.string(),
      body: z.string(),
      actionUrl: z.string().optional(),
      actionText: z.string().optional(),
    }),
  }),
]);

/**
 * Body `POST /api/v1/notifications` (R8).
 * - `{ id }` → tandai satu notifikasi dibaca.
 * - `{ all: true }` → tandai semua notifikasi yang saat ini belum dibaca.
 */
export const markNotificationsReadSchema = z
  .object({
    id: z.string().min(1).optional(),
    all: z.literal(true).optional(),
  })
  .refine((v) => v.all === true || Boolean(v.id), {
    message: 'Sertakan id notifikasi atau all: true',
  });


