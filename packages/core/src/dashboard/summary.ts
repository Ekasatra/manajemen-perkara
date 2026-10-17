import type { DbExecutor } from '../kernel/db-helpers';
import type { PolicyUser } from '../kernel/policy';
import { can } from '../kernel/policy';
import type { DashboardData, DashboardTenggatItem } from '@ekasatra/shared';
import { getSetting } from '../settings/read';
import {
  getCaseSummaryForDashboard,
  getUpcomingSchedulesForDashboard,
  getTenggat14HariCases,
  listVisibleCaseIds,
} from '../cases/read';
import {
  getSuratSummaryForDashboard,
  getSuratTrend6Bulan,
  getApprovalMenungguSaya,
  getSuratPersonalNotifications,
} from '../surat/read';
import { outstandingSummary, getTenggat14HariInvoices } from '../finance/read';
import { getNewClientsCountThisMonth } from '../clients/read';
import { getRecentActivitiesForDashboard } from '../audit/read';

export interface DashboardUser extends PolicyUser {
  userId: string;
}

/**
 * Endpoint ringkas agregasi data dashboard (PRD §5.10 & G1, G6).
 * Membaca data modul lain hanya lewat fungsi baca @ekasatra/core.
 */
export async function getDashboardData(
  db: DbExecutor,
  user: DashboardUser,
): Promise<DashboardData> {
  // 1. Tentukan tanggal hari ini dan rentang tanggal (WIB)
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in7DaysStr = in7Days.toISOString().slice(0, 10);

  const in14Days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const in14DaysStr = in14Days.toISOString().slice(0, 10);

  const startOfMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // 2. Hak lihat keuangan / piutang
  const canViewInvoices = can(user, 'R', 'invoices');

  // 3. Prasyarat bersama: setting cakupan, ID perkara terlihat, dan approval
  //    menunggu saya — masing-masing cukup SEKALI, lalu dipakai ulang semua cabang.
  const scopeAssignedOnly = await getSetting<boolean>(db, 'scope_assigned_only', true);
  const visibleIds = await listVisibleCaseIds(db, user.userId, user.role, scopeAssignedOnly);
  const approvalMenungguSaya = await getApprovalMenungguSaya(db, user.userId);

  const scopeOptions = {
    userId: user.userId,
    role: user.role,
    scopeAssignedOnly,
    preloadedVisibleIds: visibleIds,
  };

  // 4. Eksekusi fungsi baca modul-modul lain secara paralel
  const [
    casesSummary,
    sidang7Hari,
    suratSummary,
    suratTrend6Bulan,
    piutangData,
    klienBaruBulanIni,
    tenggatCases,
    tenggatInvoices,
    aktivitasTerbaru,
    suratPersonalNotifs,
  ] = await Promise.all([
    getCaseSummaryForDashboard(db, scopeOptions),
    getUpcomingSchedulesForDashboard(db, todayStr, in7DaysStr, scopeOptions),
    getSuratSummaryForDashboard(db, todayStr),
    getSuratTrend6Bulan(db),
    outstandingSummary(db, canViewInvoices),
    getNewClientsCountThisMonth(db, startOfMonthStr),
    getTenggat14HariCases(db, todayStr, in14DaysStr, scopeOptions),
    getTenggat14HariInvoices(db, todayStr, in14DaysStr, canViewInvoices),
    getRecentActivitiesForDashboard(db, 10),
    getSuratPersonalNotifications(db, user.userId, approvalMenungguSaya),
  ]);

  // Gabungkan tenggat 14 hari
  const tenggat14Hari: DashboardTenggatItem[] = [...tenggatCases, ...tenggatInvoices].sort(
    (a, b) => a.daysLeft - b.daysLeft,
  );

  // Gabungkan notifikasi personal (approval, disposisi, reject, sidang)
  const notifikasiPersonal = [...suratPersonalNotifs];

  // Tambahkan jadwal sidang 7 hari ke depan ke notifikasi personal bila belum ada
  for (const s of sidang7Hari) {
    if (!s.scheduleDate) continue;
    const todayMs = new Date(todayStr).getTime();
    const sMs = new Date(s.scheduleDate).getTime();
    const daysLeft = Math.ceil((sMs - todayMs) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) {
      notifikasiPersonal.push({
        id: `sidang-notif-${s.id}`,
        type: 'sidang',
        title: `Sidang Mendatang: ${s.caseTitle}`,
        description: `${s.kind} pada ${s.scheduleDate}${s.scheduleTime ? ` ${s.scheduleTime} WIB` : ''}${s.location ? ` di ${s.location}` : ''}`,
        date: s.scheduleDate,
        link: `/cases/${s.caseId}`,
        urgency: daysLeft <= 1 ? 'high' : 'medium',
      });
    }
  }

  return {
    cases: casesSummary,
    sidang7Hari,
    surat: {
      ...suratSummary,
      trend6Bulan: suratTrend6Bulan,
    },
    approvalMenungguSaya,
    piutang: piutangData,
    klienBaruBulanIni,
    tenggat14Hari,
    aktivitasTerbaru,
    notifikasiPersonal,
  };
}
