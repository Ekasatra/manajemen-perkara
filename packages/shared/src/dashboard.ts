
export interface DashboardCaseSummary {
  activeCount: number;
  completedCount: number;
  byStatus: { status: string; count: number }[];
}

export interface DashboardScheduleItem {
  id: string;
  caseId: string;
  caseTitle: string;
  scheduleDate: string;
  scheduleTime?: string | null;
  kind: string;
  location?: string | null;
  status: string;
}

export interface DashboardSuratSummary {
  masukHariIni: number;
  keluarHariIni: number;
  masukBelumSelesai: number;
  trend6Bulan: { month: string; suratMasuk: number; suratKeluar: number }[];
}

export interface DashboardApprovalItem {
  id: string;
  subject: string;
  noSurat?: string | null;
  status: string;
  tglSurat?: string | null;
}

export interface DashboardPiutangSummary {
  authorized: boolean;
  totalOutstanding: number | null;
  invoiceCount: number | null;
}

export interface DashboardTenggatItem {
  id: string;
  type: 'upaya_hukum' | 'sidang' | 'invoice';
  title: string;
  targetDate: string;
  daysLeft: number;
  extraInfo?: string;
  link: string;
}

export interface DashboardActivityItem {
  id: number;
  userName?: string | null;
  action: string;
  module: string;
  description?: string | null;
  createdAt: string;
}

export interface PersonalNotificationItem {
  id: string;
  type: 'approval' | 'disposisi' | 'reject' | 'sidang';
  title: string;
  description: string;
  date: string;
  link: string;
  urgency: 'high' | 'medium' | 'low';
}

export interface DashboardData {
  cases: DashboardCaseSummary;
  sidang7Hari: DashboardScheduleItem[];
  surat: DashboardSuratSummary;
  approvalMenungguSaya: {
    count: number;
    items: DashboardApprovalItem[];
  };
  piutang: DashboardPiutangSummary;
  klienBaruBulanIni: number;
  tenggat14Hari: DashboardTenggatItem[];
  aktivitasTerbaru: DashboardActivityItem[];
  notifikasiPersonal: PersonalNotificationItem[];
}
