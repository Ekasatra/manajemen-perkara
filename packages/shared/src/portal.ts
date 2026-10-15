export const PORTAL_GENERIC_ERROR_MESSAGE =
  'Tautan portal tidak valid atau sudah dinonaktifkan. Silakan hubungi kantor kami untuk mendapatkan tautan akses yang sah.';

export interface PortalClientSummary {
  id: string;
  name: string;
  clientCode: string;
  email?: string | null;
  phone?: string | null;
}

export interface PortalCaseItem {
  id: string;
  regNo: string;
  title: string;
  court?: string | null;
  caseNumber?: string | null;
  caseType?: string | null;
  status: string;
  startDate?: string | null;
  putusDate?: string | null;
}

export interface PortalTimelineItem {
  id: string;
  caseId: string;
  caseTitle: string;
  eventDate: string;
  eventType: string;
  title: string;
  description?: string | null;
}

export interface PortalScheduleItem {
  id: string;
  caseId: string;
  caseTitle: string;
  scheduleDate: string;
  scheduleTime?: string | null;
  kind: string;
  location?: string | null;
  status: string;
}

export interface PortalDocumentItem {
  id: string;
  caseId: string;
  caseTitle: string;
  title: string;
  fileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt: string;
}

export interface PortalSuratMasukItem {
  id: string;
  caseId: string;
  caseTitle: string;
  noAgenda: string;
  sender: string;
  subject: string;
  tglTerima: string;
}

export interface PortalInvoiceItem {
  id: string;
  invoiceNo: string;
  description?: string | null;
  amount: number;
  paidAmount: number;
  status: string;
  invoiceDate: string;
  dueDate?: string | null;
}

export interface PortalData {
  client: PortalClientSummary;
  cases: PortalCaseItem[];
  timeline: PortalTimelineItem[];
  schedules: PortalScheduleItem[];
  documents: PortalDocumentItem[];
  suratMasuk: PortalSuratMasukItem[];
  invoices: PortalInvoiceItem[];
}

