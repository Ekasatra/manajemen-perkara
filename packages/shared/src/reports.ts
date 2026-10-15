import { z } from 'zod';

export const reportFormatSchema = z.enum(['json', 'csv', 'pdf']).default('json');
export type ReportFormat = z.infer<typeof reportFormatSchema>;

export const reportDateFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  format: reportFormatSchema.optional(),
});

export const casesReportFilterSchema = reportDateFilterSchema.extend({
  status: z.string().optional(),
  clientId: z.string().uuid().optional(),
});
export type CasesReportFilter = z.infer<typeof casesReportFilterSchema>;

export const suratMasukReportFilterSchema = reportDateFilterSchema.extend({
  status: z.string().optional(),
  sifat: z.string().optional(),
  caseId: z.string().uuid().optional(),
});
export type SuratMasukReportFilter = z.infer<typeof suratMasukReportFilterSchema>;

export const suratKeluarReportFilterSchema = reportDateFilterSchema.extend({
  status: z.string().optional(),
  jenis: z.string().optional(),
  caseId: z.string().uuid().optional(),
});
export type SuratKeluarReportFilter = z.infer<typeof suratKeluarReportFilterSchema>;

export const honorariumReportFilterSchema = reportDateFilterSchema.extend({
  status: z.string().optional(),
  caseId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
});
export type HonorariumReportFilter = z.infer<typeof honorariumReportFilterSchema>;

export const schedulesReportFilterSchema = reportDateFilterSchema.extend({
  status: z.string().optional(),
  kind: z.string().optional(),
  caseId: z.string().uuid().optional(),
});
export type SchedulesReportFilter = z.infer<typeof schedulesReportFilterSchema>;

export interface CasesReportItem {
  id: string;
  regNo: string;
  title: string;
  clientName: string;
  court?: string | null;
  caseNumber?: string | null;
  status: string;
  startDate?: string | null;
  putusDate?: string | null;
  upayaDeadline?: string | null;
}

export interface SuratMasukReportItem {
  id: string;
  noAgenda: string;
  noSurat?: string | null;
  sender: string;
  subject: string;
  tglSurat?: string | null;
  tglTerima: string;
  sifat: string;
  status: string;
  assignedToName?: string | null;
  caseTitle?: string | null;
}

export interface SuratKeluarReportItem {
  id: string;
  noSurat: string;
  subject: string;
  destination: string;
  jenis: string;
  tglSurat?: string | null;
  status: string;
  creatorName?: string | null;
  reviewerName?: string | null;
  signerName?: string | null;
  caseTitle?: string | null;
}

export interface HonorariumReportItem {
  id: string;
  caseTitle: string;
  userName: string;
  draftAmount: number;
  publishedAmount?: number | null;
  status: string;
  publishedAt?: string | null;
  paidAt?: string | null;
}

export interface SchedulesReportItem {
  id: string;
  scheduleDate: string;
  scheduleTime?: string | null;
  kind: string;
  caseTitle: string;
  location?: string | null;
  notes?: string | null;
  status: string;
}

export interface CaseProgressReport {
  caseInfo: {
    id: string;
    regNo: string;
    title: string;
    clientName: string;
    court?: string | null;
    caseNumber?: string | null;
    status: string;
    startDate?: string | null;
    putusDate?: string | null;
    upayaDeadline?: string | null;
    description?: string | null;
  };
  timeline: {
    eventDate: string;
    eventType: string;
    title: string;
    description?: string | null;
  }[];
  schedules: {
    scheduleDate: string;
    scheduleTime?: string | null;
    kind: string;
    location?: string | null;
    status: string;
  }[];
}

